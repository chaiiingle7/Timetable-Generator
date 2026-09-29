import React, { useState, useMemo } from "react";
import { Plus, Trash2, Check, Clock, Sparkles, Users, BookOpen, Beaker, AlertTriangle } from "lucide-react";
import { Field, EmptyState } from "../components/ui";
import { uid, DEFAULT_DAYS, buildSampleConfig } from "../lib";

export default function InputPage({ config, setConfig, onGenerate, generating, genError }) {
  const [section, setSection] = useState("schedule");

  const updateField = (field, value) => setConfig((c) => ({ ...c, [field]: value }));

  const toggleDay = (day) => {
    setConfig((c) => ({
      ...c,
      days: c.days.includes(day)
        ? c.days.filter((d) => d !== day)
        : [...c.days, day].sort((a, b) => DEFAULT_DAYS.indexOf(a) - DEFAULT_DAYS.indexOf(b) || (a > b ? 1 : -1)),
    }));
  };

  const setDayOverride = (day, periods) => setConfig((c) => ({ ...c, dayOverrides: { ...c.dayOverrides, [day]: periods } }));
  const clearDayOverride = (day) => setConfig((c) => {
    const next = { ...c.dayOverrides };
    delete next[day];
    return { ...c, dayOverrides: next };
  });

  // Breaks
  const addBreak = () => setConfig((c) => ({ ...c, breaks: [...c.breaks, { id: uid("br"), afterPeriod: 1, duration: 15, label: "Break" }] }));
  const updateBreak = (id, field, value) => setConfig((c) => ({ ...c, breaks: c.breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));
  const removeBreak = (id) => setConfig((c) => ({ ...c, breaks: c.breaks.filter((b) => b.id !== id) }));

  // Teachers
  const addTeacher = () => setConfig((c) => ({ ...c, teachers: [...c.teachers, { id: uid("t"), name: "", email: "", subjects: [], maxWeeklyHours: 18, unavailable: [] }] }));
  const updateTeacher = (id, field, value) => setConfig((c) => ({ ...c, teachers: c.teachers.map((t) => (t.id === id ? { ...t, [field]: value } : t)) }));
  const removeTeacher = (id) => setConfig((c) => ({ ...c, teachers: c.teachers.filter((t) => t.id !== id) }));

  const addTeacherSubject = (teacherId) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: [...t.subjects, { id: uid("ts"), name: "", weeklyHours: 3, isLab: false, labBlockSize: c.labBlockSize }] } : t),
  }));
  const updateTeacherSubject = (teacherId, tsId, field, value) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: t.subjects.map((s) => s.id === tsId ? { ...s, [field]: value } : s) } : t),
  }));
  const removeTeacherSubject = (teacherId, tsId) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: t.subjects.filter((s) => s.id !== tsId) } : t),
  }));

  const addUnavailable = (teacherId) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, unavailable: [...(t.unavailable || []), { day: c.days[0], period: 1 }] } : t),
  }));
  const updateUnavailable = (teacherId, idx, field, value) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, unavailable: t.unavailable.map((u, i) => i === idx ? { ...u, [field]: value } : u) } : t),
  }));
  const removeUnavailable = (teacherId, idx) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, unavailable: (t.unavailable || []).filter((_, i) => i !== idx) } : t),
  }));

  // Batches
  const addBatch = () => setConfig((c) => ({ ...c, batches: [...c.batches, { id: uid("b"), name: "", subBatches: 0, subjects: [] }] }));
  const updateBatch = (id, field, value) => setConfig((c) => ({ ...c, batches: c.batches.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));
  const removeBatch = (id) => setConfig((c) => ({ ...c, batches: c.batches.filter((b) => b.id !== id) }));

  const addSubject = (batchId) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: [...b.subjects, { id: uid("s"), name: "", periodsPerWeek: 0, isLab: false, labBlockSize: c.labBlockSize, teacherId: "" }] } : b),
  }));
  const updateSubject = (batchId, subjId, field, value) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: b.subjects.map((s) => s.id === subjId ? { ...s, [field]: value } : s) } : b),
  }));
  const applyTeacherSubject = (batchId, subjId, teacherId, teacherSubjectId) => setConfig((c) => {
    const teacher = c.teachers.find((t) => t.id === teacherId);
    const ts = teacher?.subjects.find((s) => s.id === teacherSubjectId);
    return {
      ...c,
      batches: c.batches.map((b) => b.id === batchId ? {
        ...b,
        subjects: b.subjects.map((s) => s.id === subjId ? {
          ...s,
          teacherId,
          name: ts?.name || "",
          periodsPerWeek: ts?.weeklyHours ?? s.periodsPerWeek,
          isLab: ts?.isLab || false,
          labBlockSize: ts?.labBlockSize || c.labBlockSize,
        } : s),
      } : b),
    };
  });
  const removeSubject = (batchId, subjId) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: b.subjects.filter((s) => s.id !== subjId) } : b),
  }));

  const sections = [
    { key: "schedule", label: "Schedule Settings", icon: Clock },
    { key: "breaks", label: "Breaks & Labs", icon: Sparkles },
    { key: "teachers", label: "Teachers", icon: Users },
    { key: "batches", label: "Batches & Subjects", icon: BookOpen },
  ];

  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div className="tg-section-title">Set up your timetable</div>
          <div className="tg-section-sub" style={{ marginBottom: 0 }}>Fill in each section, then generate. You can always come back and adjust.</div>
        </div>
        <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={() => setConfig(buildSampleConfig())}>Load sample data</button>
      </div>

      <div className="tg-pill-tabs" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {sections.map((s) => (
          <button key={s.key} className={`tg-pill ${section === s.key ? "active" : ""}`} onClick={() => setSection(s.key)}>{s.label}</button>
        ))}
      </div>

      {section === "schedule" && (
        <>
          <div className="tg-card">
            <div className="tg-section-title" style={{ fontSize: 18 }}>Working week</div>
            <div className="tg-section-sub">Which days run classes, and how the day is divided into periods.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <button key={d} className="tg-chip" style={{ cursor: "pointer", background: config.days.includes(d) ? "var(--tg-ink)" : "#f5f5f7", color: config.days.includes(d) ? "white" : "var(--tg-ink)" }} onClick={() => toggleDay(d)}>
                  {config.days.includes(d) && <Check size={12} />} {d}
                </button>
              ))}
            </div>
            <div className="tg-row tg-grid-4">
              <Field label="Periods per day (default)">
                <input className="tg-input" type="number" min={1} max={14} value={config.periodsPerDay} onChange={(e) => updateField("periodsPerDay", Math.max(1, Number(e.target.value)))} />
              </Field>
              <Field label="Minutes per lecture">
                <input className="tg-input" type="number" min={20} max={120} step={5} value={config.periodDuration} onChange={(e) => updateField("periodDuration", Number(e.target.value))} />
              </Field>
              <Field label="Day starts at">
                <input className="tg-input" type="time" value={config.dayStartTime} onChange={(e) => updateField("dayStartTime", e.target.value)} />
              </Field>
              <Field label="Default lab length (periods)">
                <input className="tg-input" type="number" min={2} max={6} value={config.labBlockSize} onChange={(e) => updateField("labBlockSize", Number(e.target.value))} />
              </Field>
            </div>
            <div className="tg-subtle">Lab sessions run longer than a normal lecture — by default {config.labBlockSize} back-to-back periods (≈{config.labBlockSize * config.periodDuration} minutes) reserved as one block, so they never get split across a break.</div>
          </div>

          <div className="tg-card">
            <div className="tg-section-title" style={{ fontSize: 18 }}>Day-specific hours</div>
            <div className="tg-section-sub">Give a day fewer periods for a half day, or leave it on the default.</div>
            {config.days.map((day) => {
              const hasOverride = config.dayOverrides && config.dayOverrides[day] != null;
              return (
                <div key={day} className="tg-list-item" style={{ alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, minWidth: 130 }}>
                      <input type="checkbox" checked={!!hasOverride} onChange={(e) => e.target.checked ? setDayOverride(day, Math.max(1, config.periodsPerDay - 3)) : clearDayOverride(day)} />
                      {day} — half day
                    </label>
                    {hasOverride ? (
                      <>
                        <input className="tg-input" type="number" min={1} max={config.periodsPerDay} style={{ width: 90 }} value={config.dayOverrides[day]}
                          onChange={(e) => setDayOverride(day, Math.max(1, Math.min(config.periodsPerDay, Number(e.target.value))))} />
                        <span className="tg-subtle">periods that day (default is {config.periodsPerDay})</span>
                      </>
                    ) : (
                      <span className="tg-subtle">Uses the default — {config.periodsPerDay} periods</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {section === "breaks" && (
        <div className="tg-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="tg-section-title" style={{ fontSize: 18 }}>Breaks</div>
              <div className="tg-section-sub">Lunch and short breaks sit between periods and are skipped by the scheduler.</div>
            </div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addBreak}><Plus size={14} /> Add break</button>
          </div>
          {config.breaks.length === 0 && <EmptyState icon={Clock} title="No breaks yet" body="Add a lunch break or short break between periods." />}
          {config.breaks.map((b) => (
            <div className="tg-list-item" key={b.id} style={{ flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input className="tg-input" style={{ width: 150 }} value={b.label} placeholder="Break name" onChange={(e) => updateBreak(b.id, "label", e.target.value)} />
                <input className="tg-input" style={{ width: 130 }} type="number" min={1} max={config.periodsPerDay - 1} value={b.afterPeriod}
                  onChange={(e) => updateBreak(b.id, "afterPeriod", Math.max(1, Number(e.target.value)))} />
                <span className="tg-subtle">after period</span>
                <input className="tg-input" style={{ width: 90 }} type="number" min={5} max={120} step={5} value={b.duration}
                  onChange={(e) => updateBreak(b.id, "duration", Math.max(5, Number(e.target.value)))} />
                <span className="tg-subtle">minutes</span>
              </div>
              <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeBreak(b.id)}><Trash2 size={14} /> Remove</button>
            </div>
          ))}
        </div>
      )}

      {section === "teachers" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="tg-section-title" style={{ fontSize: 18, margin: 0 }}>Teachers</div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addTeacher}><Plus size={14} /> Add teacher</button>
          </div>
          {config.teachers.length === 0 && <div className="tg-card"><EmptyState icon={Users} title="No teachers yet" body="Add teachers, the subjects they teach, and their weekly hour limits." /></div>}
          {config.teachers.map((t) => (
            <div className="tg-card" key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name || "Unnamed teacher"}</div>
                <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeTeacher(t.id)}><Trash2 size={14} /> Remove</button>
              </div>
              <div className="tg-row tg-grid-3">
                <Field label="Name">
                  <input className="tg-input" value={t.name} onChange={(e) => updateTeacher(t.id, "name", e.target.value)} placeholder="e.g. Dr. Anika Rao" />
                </Field>
                <Field label="Email (optional)">
                  <input className="tg-input" value={t.email} onChange={(e) => updateTeacher(t.id, "email", e.target.value)} placeholder="teacher@college.edu" />
                </Field>
                <Field label="Max weekly periods">
                  <input className="tg-input" type="number" min={1} max={40} value={t.maxWeeklyHours} onChange={(e) => updateTeacher(t.id, "maxWeeklyHours", Math.max(1, Number(e.target.value)))} />
                </Field>
              </div>

              <div style={{ fontWeight: 600, fontSize: 14, margin: "10px 0 8px" }}>Subjects this teacher can teach</div>
              {(t.subjects || []).map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--tg-line-soft)" }}>
                  <input className="tg-input" style={{ width: 180 }} value={s.name} placeholder="Subject name" onChange={(e) => updateTeacherSubject(t.id, s.id, "name", e.target.value)} />
                  <input className="tg-input" style={{ width: 90 }} type="number" min={1} max={20} value={s.weeklyHours} title="Weekly hours" onChange={(e) => updateTeacherSubject(t.id, s.id, "weeklyHours", Math.max(1, Number(e.target.value)))} />
                  <span className="tg-subtle">periods/wk</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={s.isLab} onChange={(e) => updateTeacherSubject(t.id, s.id, "isLab", e.target.checked)} /> Lab?
                  </label>
                  {s.isLab && (
                    <>
                      <input className="tg-input" style={{ width: 70 }} type="number" min={2} max={6} value={s.labBlockSize} onChange={(e) => updateTeacherSubject(t.id, s.id, "labBlockSize", Math.max(2, Number(e.target.value)))} />
                      <span className="tg-subtle">periods per lab</span>
                    </>
                  )}
                  <button className="tg-btn tg-btn-danger tg-btn-sm" style={{ marginLeft: "auto" }} onClick={() => removeTeacherSubject(t.id, s.id)}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="tg-btn tg-btn-ghost" style={{ fontSize: 13 }} onClick={() => addTeacherSubject(t.id)}><Plus size={14} /> Add subject</button>

              <div style={{ fontWeight: 600, fontSize: 14, margin: "18px 0 4px" }}>Blocked slots (teacher unavailable)</div>
              <div className="tg-subtle" style={{ marginBottom: 8 }}>Periods this teacher can never be scheduled in.</div>
              {(t.unavailable || []).map((u, idx) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
                  <select className="tg-select" style={{ width: 100 }} value={u.day} onChange={(e) => updateUnavailable(t.id, idx, "day", e.target.value)}>
                    {config.days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="tg-select" style={{ width: 110 }} value={u.period} onChange={(e) => updateUnavailable(t.id, idx, "period", Number(e.target.value))}>
                    {Array.from({ length: config.periodsPerDay }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                  <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeUnavailable(t.id, idx)}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="tg-btn tg-btn-ghost" style={{ fontSize: 13 }} onClick={() => addUnavailable(t.id)}><Plus size={14} /> Block a slot</button>
            </div>
          ))}
        </>
      )}

      {section === "batches" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="tg-section-title" style={{ fontSize: 18, margin: 0 }}>Batches & Subjects</div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addBatch}><Plus size={14} /> Add batch</button>
          </div>
          {config.batches.length === 0 && <div className="tg-card"><EmptyState icon={BookOpen} title="No batches yet" body="Add a batch, then pick subjects from what your teachers can teach." /></div>}
          {config.batches.map((b) => (
            <div className="tg-card" key={b.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{b.name || "Unnamed batch"}</div>
                <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeBatch(b.id)}><Trash2 size={14} /> Remove</button>
              </div>
              <div className="tg-row tg-grid-2" style={{ marginBottom: 18 }}>
                <Field label="Batch name">
                  <input className="tg-input" value={b.name} onChange={(e) => updateBatch(b.id, "name", e.target.value)} placeholder="e.g. CSE - Year 2 A" />
                </Field>
                <Field label="Sub-batches for lab rotation (0 or 2+)">
                  <input className="tg-input" type="number" min={0} max={6} value={b.subBatches || 0} onChange={(e) => updateBatch(b.id, "subBatches", Math.max(0, Number(e.target.value)))} />
                </Field>
              </div>

              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Subjects for this batch</div>
              <div className="tg-subtle" style={{ marginBottom: 10 }}>Pick a teacher and one of their subjects — hours and lab settings fill in automatically.</div>
              {(b.subjects || []).map((s) => {
                const teacher = config.teachers.find((t) => t.id === s.teacherId);
                return (
                  <div key={s.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--tg-line-soft)" }}>
                    <select className="tg-select" style={{ width: 170 }} value={s.teacherId} onChange={(e) => applyTeacherSubject(b.id, s.id, e.target.value, "")}>
                      <option value="">— pick teacher —</option>
                      {config.teachers.map((t) => <option key={t.id} value={t.id}>{t.name || "Unnamed teacher"}</option>)}
                    </select>
                    <select className="tg-select" style={{ width: 170 }} value={teacher?.subjects.find((ts) => ts.id)?.id || ""} disabled={!teacher}
                      onChange={(e) => {
                        const ts = teacher.subjects.find((x) => x.id === e.target.value);
                        applyTeacherSubject(b.id, s.id, s.teacherId, e.target.value);
                      }}>
                      <option value="">{teacher ? "— pick subject —" : "pick a teacher first"}</option>
                      {(teacher?.subjects || []).map((ts) => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                    </select>
                    <input className="tg-input" style={{ width: 80 }} type="number" min={0} max={20} value={s.periodsPerWeek} title="Periods per week"
                      onChange={(e) => updateSubject(b.id, s.id, "periodsPerWeek", Math.max(0, Number(e.target.value)))} />
                    <span className="tg-subtle">periods/wk</span>
                    {s.isLab && <span className="tg-badge tg-badge-blue"><Beaker size={10} /> Lab</span>}
                    <button className="tg-btn tg-btn-danger tg-btn-sm" style={{ marginLeft: "auto" }} onClick={() => removeSubject(b.id, s.id)}><Trash2 size={13} /></button>
                  </div>
                );
              })}
              <button className="tg-btn tg-btn-ghost" style={{ fontSize: 13 }} onClick={() => addSubject(b.id)}><Plus size={14} /> Add subject</button>
            </div>
          ))}
        </>
      )}

      <div className="tg-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Ready?</div>
          <div className="tg-subtle">The solver runs on the Python backend — usually a couple of seconds.</div>
        </div>
        <button className="tg-btn tg-btn-primary" onClick={onGenerate} disabled={generating}>
          {generating ? "Generating…" : "Generate timetable"}
        </button>
      </div>
      {genError && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--tg-red)", fontSize: 14 }}>
          <AlertTriangle size={16} /> {genError}
        </div>
      )}
    </div>
  );
}
