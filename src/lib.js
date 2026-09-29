export const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

let uidCounter = 1;
export const uid = (prefix) => `${prefix}${uidCounter++}`;

export function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const ROTATION_COLORS = ["#0071e3", "#1e8e3e", "#b25000", "#8e44ad", "#c2185b", "#00838f"];
export const subBatchLabel = (i) => String.fromCharCode(65 + i); // A, B, C...
export const subBatchColor = (i) => ROTATION_COLORS[i % ROTATION_COLORS.length];
