"""Scheduling engine — heuristic constraint solver with randomized restarts.

Hard constraints:  no batch/teacher double-booking, weekly-hour caps,
                   teacher unavailability, lab blocks stay contiguous and
                   never straddle a break, subject weekly hours met.
Soft constraints:  avoid back-to-back periods for the same teacher,
                   avoid repeating the same subject twice in a day.
"""
import math


def seeded_rng(seed):
    """Deterministic pseudo-random generator (same as the JS version)."""
    s = seed % 2147483647
    if s <= 0:
        s += 2147483646

    def rng():
        nonlocal s
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646

    return rng


def shuffle(arr, rng):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rng() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def periods_for_day(config, day):
    override = (config.get("dayOverrides") or {}).get(day)
    return override if override and override > 0 else config.get("periodsPerDay", 7)


def teacher_availability(teacher, config):
    total = sum(periods_for_day(config, d) for d in config["days"])
    return total - len(teacher.get("unavailable") or [])


def contiguous_ok(start_period, size, break_after_set):
    """No break may fall strictly inside a block occupying
    [start_period, start_period + size - 1]. A break 'after period X'
    sits between X and X+1."""
    for p in range(start_period, start_period + size - 1):
        if p in break_after_set:
            return False
    return True


def build_rotation_rounds(batch, config):
    """A batch split into sub-batches runs labs in parallel: every sub-batch
    is 'in lab' at the same slot, each doing a different subject with its own
    teacher. Across rounds, each sub-batch cycles through every lab."""
    lab_subjects = [s for s in (batch.get("subjects") or [])
                    if s.get("isLab") and s.get("teacherId")]
    k = batch.get("subBatches") or 0
    if k < 2 or not lab_subjects:
        return []

    block_size = lab_subjects[0].get("labBlockSize") or config.get("labBlockSize", 2)
    remain = [{s["id"]: math.ceil(s["periodsPerWeek"] / block_size)
               for s in lab_subjects} for _ in range(k)]

    rounds = []
    guard = 0
    while sum(sum(m.values()) for m in remain) > 0 and guard < 100:
        guard += 1
        used_this_round = set()
        assignments = []
        # most-loaded sub-batch first
        order = sorted(range(k), key=lambda sb: -sum(remain[sb].values()))
        for sb in order:
            best, best_val = None, 0
            for s in lab_subjects:
                if s["id"] in used_this_round:
                    continue
                v = remain[sb][s["id"]]
                if v > best_val:
                    best_val, best = v, s
            if best:
                used_this_round.add(best["id"])
                remain[sb][best["id"]] -= 1
                assignments.append({
                    "subBatchIndex": sb,
                    "subjectId": best["id"],
                    "subjectName": best["name"],
                    "teacherId": best["teacherId"],
                })
        if not assignments:
            break
        rounds.append({"blockSize": block_size, "assignments": assignments})
    return rounds


def build_units(config):
    """Break every subject into lecture units; labs become multi-period blocks."""
    units = []
    for batch in config["batches"]:
        has_sub_batches = (batch.get("subBatches") or 0) > 1
        for subj in batch.get("subjects", []):
            if has_sub_batches and subj.get("isLab"):
                continue  # rotated across sub-batches instead
            block = (subj.get("labBlockSize") or config.get("labBlockSize", 2)) \
                if subj.get("isLab") else 1
            remaining = subj["periodsPerWeek"]
            session_index = 0
            while remaining > 0:
                size = min(block, remaining) if subj.get("isLab") else 1
                units.append({
                    "id": f"u{len(units) + 1}",
                    "isRotation": False,
                    "batchId": batch["id"],
                    "batchName": batch["name"],
                    "subjectId": subj["id"],
                    "subjectName": subj["name"],
                    "isLab": bool(subj.get("isLab")),
                    "teacherId": subj.get("teacherId"),
                    "size": size,
                    "sessionIndex": session_index,
                })
                remaining -= size
                session_index += 1
        if has_sub_batches:
            for idx, rnd in enumerate(build_rotation_rounds(batch, config)):
                units.append({
                    "id": f"ru{len(units) + 1}",
                    "isRotation": True,
                    "isLab": True,
                    "batchId": batch["id"],
                    "batchName": batch["name"],
                    "subBatchCount": batch["subBatches"],
                    "size": rnd["blockSize"],
                    "roundIndex": idx,
                    "assignments": rnd["assignments"],
                })
    return units


def attempt_schedule(config, seed):
    rng = seeded_rng(seed)
    break_after_set = {b["afterPeriod"] for b in config.get("breaks", [])}
    days = config["days"]

    # slot maps: (day, period) -> cell
    batch_slot = {b["id"]: {} for b in config["batches"]}
    teacher_slot = {t["id"]: {} for t in config["teachers"]}
    teacher_weekly_count = {t["id"]: 0 for t in config["teachers"]}
    subject_day_used = set()  # (subjectId, day) or (subjectId, day, subBatch)

    unavailable = {
        t["id"]: {(u["day"], u["period"]) for u in (t.get("unavailable") or [])}
        for t in config["teachers"]
    }
    teachers_by_id = {t["id"]: t for t in config["teachers"]}

    units = build_units(config)

    def teacher_ids_of(u):
        return [a["teacherId"] for a in u["assignments"]] if u["isRotation"] else [u["teacherId"]]

    # Most-constrained-first: rotations, then labs, then busiest teachers
    def sort_key(u):
        ids = teacher_ids_of(u)
        objs = [teachers_by_id[i] for i in ids if i in teachers_by_id]
        avail = min((teacher_availability(t, config) for t in objs), default=0)
        return (not u["isRotation"], not u["isLab"], avail, rng())

    units.sort(key=sort_key)

    unplaced = []
    back_to_back = 0

    for unit in units:
        ids = teacher_ids_of(unit)
        teachers = [teachers_by_id.get(i) for i in ids]
        if any(t is None for t in teachers):
            unplaced.append({**unit, "reason": "No teacher assigned"})
            continue

        candidates = []
        for day in shuffle(days, rng):
            max_p = periods_for_day(config, day)
            for start in range(1, max_p + 1):
                if start + unit["size"] - 1 > max_p:
                    break
                if unit["isLab"] and not contiguous_ok(start, unit["size"], break_after_set):
                    continue

                free = True
                for p in range(start, start + unit["size"]):
                    if (day, p) in batch_slot[unit["batchId"]]:
                        free = False
                        break
                    for t in teachers:
                        if (day, p) in teacher_slot[t["id"]]:
                            free = False
                            break
                        if (day, p) in unavailable[t["id"]]:
                            free = False
                            break
                    if not free:
                        break
                if not free:
                    continue
                if any(teacher_weekly_count[t["id"]] + unit["size"] > (t.get("maxWeeklyHours") or math.inf)
                       for t in teachers):
                    continue

                # soft-constraint penalties
                penalty = 0.0
                for t in teachers:
                    if (day, start - 1) in teacher_slot[t["id"]]:
                        penalty += 3
                    if (day, start + unit["size"]) in teacher_slot[t["id"]]:
                        penalty += 3
                if unit["isRotation"]:
                    for a in unit["assignments"]:
                        if (a["subjectId"], day, a["subBatchIndex"]) in subject_day_used:
                            penalty += 2
                elif (unit["subjectId"], day) in subject_day_used:
                    penalty += 2
                penalty += rng()  # tie-breaker
                candidates.append({"day": day, "start": start, "penalty": penalty})

        if not candidates:
            unplaced.append({**unit, "reason": "No free slot without breaking a hard constraint"})
            continue

        candidates.sort(key=lambda c: c["penalty"])
        chosen = candidates[0]
        if chosen["penalty"] >= 3:
            back_to_back += 1

        for p in range(chosen["start"], chosen["start"] + unit["size"]):
            part = p - chosen["start"] + 1
            if unit["isRotation"]:
                batch_slot[unit["batchId"]][(chosen["day"], p)] = {
                    "isRotation": True, "isLab": True,
                    "batchId": unit["batchId"], "batchName": unit["batchName"],
                    "assignments": unit["assignments"], "part": part,
                }
                for a in unit["assignments"]:
                    teacher_slot[a["teacherId"]][(chosen["day"], p)] = {
                        "batchId": unit["batchId"], "batchName": unit["batchName"],
                        "subjectId": a["subjectId"], "subjectName": a["subjectName"],
                        "isLab": True, "subBatchIndex": a["subBatchIndex"], "part": part,
                    }
            else:
                cell = {**unit, "part": part}
                batch_slot[unit["batchId"]][(chosen["day"], p)] = cell
                teacher_slot[unit["teacherId"]][(chosen["day"], p)] = cell

        for t in teachers:
            teacher_weekly_count[t["id"]] += unit["size"]
        if unit["isRotation"]:
            for a in unit["assignments"]:
                subject_day_used.add((a["subjectId"], chosen["day"], a["subBatchIndex"]))
        else:
            subject_day_used.add((unit["subjectId"], chosen["day"]))

    # JSON needs string keys, so reshape: { id: { day: { "3": cell } } }
    def nest(slot_map):
        out = {}
        for (day, p), cell in slot_map.items():
            out.setdefault(day, {})[str(p)] = cell
        return out

    over_cap = [{"id": t["id"], "name": t["name"], "hours": teacher_weekly_count[t["id"]]}
                for t in config["teachers"]
                if teacher_weekly_count[t["id"]] > (t.get("maxWeeklyHours") or math.inf)]
    under_cap = [{"id": t["id"], "name": t["name"], "hours": teacher_weekly_count[t["id"]]}
                 for t in config["teachers"]
                 if (t.get("maxWeeklyHours") or 0) > 0
                 and teacher_weekly_count[t["id"]] < t["maxWeeklyHours"] * 0.6]

    return {
        "batchSlot": {bid: nest(m) for bid, m in batch_slot.items()},
        "teacherSlot": {tid: nest(m) for tid, m in teacher_slot.items()},
        "teacherWeeklyCount": teacher_weekly_count,
        "unplaced": unplaced,
        "backToBackCount": back_to_back,
        "overCap": over_cap,
        "underCap": under_cap,
        "seed": seed,
    }


def generate_timetable(config, attempts=40):
    if not config.get("batches") or not config.get("teachers"):
        return {"error": "Add at least one batch (with subjects) and one teacher before generating."}

    best = None
    for i in range(attempts):
        result = attempt_schedule(config, i * 7919 + 13)
        score = len(result["unplaced"]) * 1000 + result["backToBackCount"]
        if best is None or score < best["score"]:
            best = {**result, "score": score}
        if score == 0:
            break
    return best
