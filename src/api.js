// In dev, Vite proxies /api to localhost:8000.
// In production on Vercel, /api/* is served by the Python function — same URL.
const BASE = import.meta.env.VITE_API_URL || "";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const generateTimetable = (config) => post("/api/generate", { config });

export const findSubstitutes = (config, schedule, teacherId, day, period) =>
  post("/api/substitutes", { config, schedule, teacherId, day, period });

export async function loadConfig() {
  const res = await fetch(`${BASE}/api/config`);
  const data = await res.json();
  return data.config;
}

export async function saveConfig(config) {
  const res = await fetch(`${BASE}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  return res.json();
}

export async function saveTimetable(name, config, result) {
  const res = await fetch(`${BASE}/api/timetables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, config, result }),
  });
  return res.json();
}
