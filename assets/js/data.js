// Lecture data helpers shared by the browser (main.js) and the sync script (scripts/sync-sheet.mjs).

export const SHEET_ID = "1sCNdiStJb-yHKFvDT8rEG2PB440N_zsLcCN_3jDh4lM";
export const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
export const TIME_ZONE = "America/Los_Angeles";

// Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes.
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export function slugify(name) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// "8/26/2026" or "2026-08-26" → "2026-08-26"
function isoDate(value) {
  let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}

// Sheet row (keyed by header) → lecture object. Rows without a speaker or date, or with Show = "No", are dropped.
export function normalizeRows(rows) {
  return rows
    .filter((r) => r["Speaker"] && isoDate(r["Date"] || "") && !/^(no|false|hide)$/i.test(r["Show"] || ""))
    .map((r) => {
      const [org, unit] = (r["Affiliation"] || "").split("|").map((s) => s.trim());
      const slug = slugify(r["Speaker"]);
      return {
        week: Number(r["Week"]) || null,
        date: isoDate(r["Date"]),
        speaker: r["Speaker"],
        speakerTitle: r["Speaker Title"] || "",
        org: org || "",
        unit: unit || "",
        title: r["Title"] || "",
        slug,
        photo: `images/speakers/${slug}.jpg`,
        photoUrl: r["Photo URL"] || "",
        videoId: youtubeId(r["Video URL"]),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l, i) => ({ ...l, week: l.week ?? i + 1 }));
}

// Today's date in Pacific time as YYYY-MM-DD.
export function todayPacific(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// "published" | "today" | "processing" (past, no video yet) | "upcoming"
export function lectureStatus(lecture, today = todayPacific()) {
  if (lecture.videoId) return "published";
  if (lecture.date === today) return "today";
  return lecture.date < today ? "processing" : "upcoming";
}
