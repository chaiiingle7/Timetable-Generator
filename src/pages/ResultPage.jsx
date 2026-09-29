import React, { useState, useMemo } from "react";
import { GraduationCap, Users, Beaker, AlertTriangle, Check, X, Search } from "lucide-react";
import { addMinutesToTime, subBatchLabel, subBatchColor } from "../lib";
import { findSubstitutes } from "../api";

function periodsForDay(config, day) {
  const o = config.dayOverrides?.[day];
  return o && o > 0 ? o : config.periodsPerDay;
}

function periodTimes(config) {
  const times = {};
  let cur = config.dayStartTime;
  for (let p = 1; p <= config.periodsPerDay; p++) {
    times[p] = cur;
    cur = addMinutesToTime(cur, config.periodDuration);
    (config.breaks || []).forEach((b) => { if (b.afterPeriod === p) cur = addMinutesToTime(cur, b.duration); });
  }
  return times;
}

function LectureCell({ cell, subText }) {
  return (
    <div className={`tg-cell ${cell.isLab ? "tg-lab" : ""}`}>
      {cell.isLab && <span className="tg-lab-chip"><Beaker size={8} /> Lab {cell.part}/{cell.size}</span>}
      <div className="tg-cell-title">{cell.subjectName}</div>
      <div className="tg-cell-sub">{subText}</div>
    </div>
  );
}

function RotationCell({ cell }) {
  return (
    <div className="tg-cell tg-rotation">
      <div className="tg-cell-sub" style={{ marginBottom: 3 }}>Lab rotation · part {cell.part}</div>
      {cell.assignments.map((a) => (
        <div className="tg-rotation-row" key={a.subBatchIndex}>
          <span className="tg-rotation-dot" style={{ background: subBatchColor(a.subBatchIndex) }} />
          <b>{subBatchLabel(a.subBatchIndex)}</b>&nbsp;{a.subjectName}
        </div>
      ))}
    </div>
  );
}

function Grid({ config, slotMap, subTextOf }) {
  const times = useMemo(() => periodTimes(config), [config]);
  const breakAfter = (p) => (config.breaks || []).find((b) => b.afterPeriod === p);
  return (
    <div className="tg-table-wrap">
      <table className="tg-table">
        <thead>
          <tr>
            <th>Day</th>
            {Array.from({ length: config.periodsPerDay }, (_, i) => i + 1).map((p) => {
              const br = breakAfter(p);
              return (
                <th key={p}>
                  Period {p}
                  <div style={{ fontWeight: 400, fontSize: 11 }}>{times[p]}</div>
                  {br && <div style={{ fontWeight: 600, fontSize: 10, color: "var(--tg-amber)" }}>↓ {br.label} {br.duration}m</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {config.days.map((day) => {
            const dayCells = slotMap[day] || {};
            const n = periodsForDay(config, day);
            return (
              <tr key={day}>
                <td style={{ fontWeight: 600 }}>{day}</td>
                {Array.from({ length: config.periodsPerDay }, (_, i) => i + 1).map((p) => {
                  const cell = dayCells[String(p)];
                  if (p > n) return <td key={p}><div className="tg-cell tg-empty" style={{ minHeight: 24 }} /></td>;
                  if (!cell) return <td key={p}><div className="tg-cell tg-empty" /></td>;
                  return <td key={p}>{cell.isRotation ? <RotationCell cell={cell} /> : <LectureCell cell={cell} subText={subTextOf(cell)} />}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubstituteFinder({ config, schedule }) {
  const [teacherId, setTeacherId] = useState("");
  const [day, setDay] = useState(config.days[0]);
  const [period, setPeriod] = useState(1);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!teacherId) return;
    setBusy(true);
    try {
      setResult(await findSubstitutes(config, schedule, teacherId, day, period));
    } catch {
      setResult({ lecture: null, candidates: [] });
    }
    setBusy(false);
  };

  return (
    <div className="tg-card">
      <div className="tg-section-title" style={{ fontSize: 18 }}>Find a substitute</div>
      <div className="tg-section-sub">Pick the absent teacher and the slot — ranked qualified colleagues appear below.</div>
      <div className="tg-row tg-grid-4" style={{ marginBottom: 12 }}>
        <select className="tg-select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— absent teacher —</option>
          {config.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="tg-select" value={day} onChange={(e) => setDay(e.target.value)}>
          {config.days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="tg-select" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
          {Array.from({ length: config.periodsPerDay }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Period {p}</option>)}
        </select>
        <button className="tg-btn tg-btn-primary" onClick={run} disabled={busy || !teacherId}><Search size={14} /> {busy ? "Finding…" : "Find substitutes"}</button>
      </div>

      {result && (
        result.lecture ? (
          <div>
            <div className="tg-chip" style={{ marginBottom: 12 }}>
              Missing: <b>{result.lecture.subjectName}</b> — {config.teachers.find((t) => t.id === result.lecture.teacherId)?.name || "teacher"}
            </div>
            {result.candidates.length === 0 && <div className="tg-subtle">No qualified teacher is free in that slot. Try adjusting availability or weekly caps.</div>}
            {result.candidates.map((c) => (
              <div className="tg-list-item" key={c.teacher.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.teacher.name || "Unnamed teacher"}</div>
                  <div className="tg-subtle">Weekly load: {c.loadRatio.toFixed(2)} of cap</div>
                </div>
                <span className={`tg-badge ${c.wouldBeBackToBack ? "tg-badge-amber" : "tg-badge-green"}`}>
                  {c.wouldBeBackToBack ? <AlertTriangle size={11} /> : <Check size={11} />}
                  {c.wouldBeBackToBack ? "creates back-to-back" : "clean fit"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="tg-subtle">That teacher has no class in the chosen slot — no substitute needed.</div>
        )
      )}
    </div>
  );
}

export default function ResultPage({ config, schedule }) {
  const [view, setView] = useState("batch");
  const [batchId, setBatchId] = useState(config.batches[0]?.id || "");
  const [teacherId, setTeacherId] = useState(config.teachers[0]?.id || "");
  const teacherById = useMemo(() => Object.fromEntries(config.teachers.map((t) => [t.id, t])), [config.teachers]);

  const batch = config.batches.find((b) => b.id === batchId) || config.batches[0];
  const teacher = teacherById[teacherId] || config.teachers[0];

  const unplaced = schedule.unplaced || [];
  const overCap = schedule.overCap || [];
  const underCap = schedule.underCap || [];

  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px" }}>
      <div className="tg-legend">
        <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "#f5f5f7" }} /> Lecture</span>
        <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "linear-gradient(135deg,#eaf3ff,#dcebff)" }} /> Lab block</span>
        <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "#eef6ff" }} /> Sub-batch rotation</span>
      </div>

      <div className="tg-card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <div className="tg-pill-tabs">
            <button className={`tg-pill ${view === "batch" ? "active" : ""}`} onClick={() => setView("batch")}><GraduationCap size={13} /> Batch view</button>
            <button className={`tg-pill ${view === "teacher" ? "active" : ""}`} onClick={() => setView("teacher")}><Users size={13} /> Teacher view</button>
          </div>
          {view === "batch" ? (
            <select className="tg-select" style={{ maxWidth: 260 }} value={batch?.id} onChange={(e) => setBatchId(e.target.value)}>
              {config.batches.map((b) => <option key={b.id} value={b.id}>{b.name || "Unnamed batch"}</option>)}
            </select>
          ) : (
            <select className="tg-select" style={{ maxWidth: 260 }} value={teacher?.id} onChange={(e) => setTeacherId(e.target.value)}>
              {config.teachers.map((t) => <option key={t.id} value={t.id}>{t.name || "Unnamed teacher"}</option>)}
            </select>
          )}
          {view === "teacher" && teacher && (
            <span className={`tg-badge ${overCap.some((o) => o.id === teacher.id) ? "tg-badge-red" : "tg-badge-green"}`}>
              {schedule.teacherWeeklyCount?.[teacher.id] || 0} / {teacher.maxWeeklyHours} periods this week
            </span>
          )}
        </div>

        {view === "batch" && batch && (
          <Grid
            config={config}
            slotMap={schedule.batchSlot?.[batch.id] || {}}
            subTextOf={(cell) => teacherById[cell.teacherId]?.name || cell.batchName}
          />
        )}
        {view === "teacher" && teacher && (
          <Grid
            config={config}
            slotMap={schedule.teacherSlot?.[teacher.id] || {}}
            subTextOf={(cell) => `${cell.batchName}${cell.subBatchIndex != null ? ` · sub-batch ${subBatchLabel(cell.subBatchIndex)}` : ""}`}
          />
        )}
        {view === "batch" && !batch && <div className="tg-subtle">No batch selected.</div>}
        {view === "teacher" && !teacher && <div className="tg-subtle">No teacher selected.</div>}
      </div>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", margin: "20px 0" }}>
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 16 }}>Unplaced sessions</div>
          {unplaced.length === 0 ? (
            <span className="tg-badge tg-badge-green"><Check size={11} /> Everything placed</span>
          ) : (
            <div>
              {unplaced.map((u, i) => (
                <div key={i} className="tg-list-item" style={{ fontSize: 13 }}>
                  <span><b>{u.subjectName || "Lab rotation"}</b> — {u.batchName}</span>
                  <span className="tg-subtle">{u.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 16 }}>Teacher load</div>
          {config.teachers.map((t) => {
            const hrs = schedule.teacherWeeklyCount?.[t.id] || 0;
            const over = overCap.some((o) => o.id === t.id);
            const under = underCap.some((o) => o.id === t.id);
            return (
              <div className="tg-list-item" key={t.id} style={{ fontSize: 13 }}>
                <span>{t.name || "Unnamed teacher"}</span>
                <span className={`tg-badge ${over ? "tg-badge-red" : under ? "tg-badge-amber" : "tg-badge-green"}`}>{hrs}/{t.maxWeeklyHours}</span>
              </div>
            );
          })}
        </div>
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 16 }}>Quality notes</div>
          <div className="tg-list-item" style={{ fontSize: 13 }}>
            <span>Back-to-back placements</span>
            <span className="tg-badge tg-badge-blue">{schedule.backToBackCount ?? 0}</span>
          </div>
          <div className="tg-list-item" style={{ fontSize: 13 }}>
            <span>Teachers over weekly cap</span>
            <span className="tg-badge tg-badge-red">{overCap.length}</span>
          </div>
          <div className="tg-list-item" style={{ fontSize: 13 }}>
            <span>Teachers under 60% load</span>
            <span className="tg-badge tg-badge-amber">{underCap.length}</span>
          </div>
          <div className="tg-list-item" style={{ fontSize: 13 }}>
            <span>Solver restarts kept</span>
            <span className="tg-badge tg-badge-green">seed {schedule.seed}</span>
          </div>
        </div>
      </div>

      <SubstituteFinder config={config} schedule={schedule} />
    </div>
  );
}
