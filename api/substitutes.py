"""Substitute finder — ranks qualified, free teachers by least disruption."""


def find_substitutes(config, schedule, teacher_id, day, period):
    if not schedule:
        return {"lecture": None, "candidates": []}

    lecture = (schedule.get("teacherSlot", {}).get(teacher_id, {})
               .get(day, {}).get(str(period)))
    if not lecture:
        return {"lecture": None, "candidates": []}

    candidates = []
    for t in config["teachers"]:
        if t["id"] == teacher_id:
            continue
        if not any((s.get("name") or "").lower() == lecture["subjectName"].lower()
                   for s in (t.get("subjects") or [])):
            continue
        busy = schedule["teacherSlot"].get(t["id"], {}).get(day, {}).get(str(period))
        if busy:
            continue

        before = schedule["teacherSlot"].get(t["id"], {}).get(day, {}).get(str(period - 1))
        after = schedule["teacherSlot"].get(t["id"], {}).get(day, {}).get(str(period + 1))
        load = schedule.get("teacherWeeklyCount", {}).get(t["id"], 0)
        cap = t.get("maxWeeklyHours") or 1
        disruption = (1 if before else 0) + (1 if after else 0)
        load_ratio = load / cap
        score = disruption * 10 + load_ratio * 5
        candidates.append({
            "teacher": t,
            "disruption": disruption,
            "loadRatio": load_ratio,
            "score": score,
            "wouldBeBackToBack": disruption > 0,
        })

    candidates.sort(key=lambda c: c["score"])
    return {"lecture": lecture, "candidates": candidates}
