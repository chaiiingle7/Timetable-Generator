import React, { useState } from "react";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";

const FAQS = [
  ["How does the timetable get generated?", "The Python solver splits every subject into lecture units (labs become contiguous multi-period blocks), places the hardest units first, checks every hard rule before placing (no double-booking, teacher availability, weekly caps, labs never crossing a break), prefers slots that avoid back-to-backs and subject repetition, and runs dozens of attempts keeping the best one."],
  ["Some sessions couldn't be placed — what do I do?", "Check the 'Unplaced sessions' card on the Timetables page. The most common causes: a teacher's weekly cap is too low for their assigned periods, a batch has more periods than exist in the week, or blocked slots removed the only free options. Loosen the tightest constraint and regenerate."],
  ["What are sub-batch lab rotations?", "If a batch has 2+ sub-batches, lab subjects are rotated: all sub-batches go to lab at the same time, each doing a different subject with its own teacher, and they cycle every round so each sub-batch covers every lab."],
  ["How do I find a substitute for an absent teacher?", "Go to Timetables → 'Find a substitute', pick the absent teacher, day, and period. You'll get ranked qualified teachers — those with the lowest load and least disruption to their own day first."],
  ["Where is my data stored?", "Your setup is saved to Supabase (a hosted PostgreSQL database) each time you generate, and you can save full generated timetables there too. Without Supabase keys the app still works — it just can't persist between sessions."],
  ["How do I deploy this?", "Push to GitHub, import the repo on Vercel, set SUPABASE_URL and SUPABASE_ANON_KEY as environment variables, and deploy. Vercel serves the React frontend and runs the Python solver as a serverless function automatically."],
];

export default function HelpPage() {
  const [open, setOpen] = useState(0);
  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px", maxWidth: 760 }}>
      <div className="tg-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <HelpCircle size={22} />
          <div className="tg-section-title">Help & FAQ</div>
        </div>
        <div className="tg-section-sub">Everything you need to keep the timetable machine humming.</div>
        <div>
          {FAQS.map(([q, a], i) => (
            <div key={i}>
              <div className="tg-accordion-head" onClick={() => setOpen(open === i ? -1 : i)}>
                <h4>{q}</h4>
                {open === i ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              {open === i && <div className="tg-accordion-body" style={{ paddingBottom: 14 }}>{a}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
