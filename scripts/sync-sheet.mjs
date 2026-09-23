#!/usr/bin/env node
// Sync the lecture Google Sheet into the repo:
//   1. download the sheet as CSV and write data/lectures.json
//   2. download any missing speaker photos into images/speakers/<slug>.jpg (square, 480px)
//   3. pre-render the lecture cards into index.html (for search engines and no-JS visitors)
//
// Usage: node scripts/sync-sheet.mjs [--csv path/to/local.csv] [--refresh-photos]
// No dependencies. Image resizing uses ImageMagick (Linux/CI) or sips (macOS).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHEET_CSV_URL, normalizeRows, parseCSV } from "../assets/js/data.js";
import { renderLectures } from "../assets/js/render.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const csvArg = args.includes("--csv") ? args[args.indexOf("--csv") + 1] : null;
const refreshPhotos = args.includes("--refresh-photos");
const PHOTO_SIZE = 480;
const UA = "Mozilla/5.0 (compatible; EnergySeminarSync/1.0; +https://github.com/scott-moura/energy-engineering-seminar)";

const warn = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `⚠ ${msg}`);
const has = (cmd) => { try { execFileSync("which", [cmd], { stdio: "ignore" }); return true; } catch { return false; } };

async function fetchImage(url) {
  // Try the URL as given, then with common extensions (sheet URLs sometimes lose them).
  for (const candidate of [url, `${url}.png`, `${url}.jpg`]) {
    try {
      const res = await fetch(candidate, { headers: { "User-Agent": UA, Accept: "image/*" }, redirect: "follow" });
      const type = res.headers.get("content-type") || "";
      if (res.ok && type.startsWith("image/")) return Buffer.from(await res.arrayBuffer());
    } catch { /* try next candidate */ }
    if (/\.(png|jpe?g|webp|gif)$/i.test(url)) break;
  }
  return null;
}

function squareJpeg(input, output) {
  if (has("magick") || has("convert")) {
    const bin = has("magick") ? "magick" : "convert";
    execFileSync(bin, [input, "-auto-orient", "-background", "white", "-flatten",
      "-resize", `${PHOTO_SIZE}x${PHOTO_SIZE}^`, "-gravity", "north", "-extent", `${PHOTO_SIZE}x${PHOTO_SIZE}`,
      "-strip", "-quality", "82", output]);
  } else if (has("sips")) {
    const info = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", input]).toString();
    const w = Number(info.match(/pixelWidth: (\d+)/)[1]), h = Number(info.match(/pixelHeight: (\d+)/)[1]);
    const s = Math.min(w, h);
    // Keep the top of portrait photos (where the face usually is).
    const offsetY = h > w ? Math.round((h - s) * 0.15) : 0;
    const q = ["-s", "format", "jpeg", "-s", "formatOptions", "82"];
    execFileSync("sips", ["-c", String(s), String(s), "--cropOffset", String(offsetY), String(Math.round((w - s) / 2)), input, ...q, "--out", output], { stdio: "ignore" });
    if (s > PHOTO_SIZE) execFileSync("sips", ["-z", String(PHOTO_SIZE), String(PHOTO_SIZE), output], { stdio: "ignore" });
  } else {
    throw new Error("No image tool found (install ImageMagick)");
  }
}

async function syncPhotos(lectures) {
  mkdirSync(join(ROOT, "images/speakers"), { recursive: true });
  for (const l of lectures) {
    const dest = join(ROOT, l.photo);
    if (l.photoUrl && (refreshPhotos || !existsSync(dest))) {
      const buf = await fetchImage(l.photoUrl);
      if (buf) {
        const tmp = join(tmpdir(), `speaker-${l.slug}-${Date.now()}`);
        writeFileSync(tmp, buf);
        try { squareJpeg(tmp, dest); console.log(`✓ photo ${l.photo}`); }
        catch (e) { warn(`Could not resize photo for ${l.speaker}: ${e.message}`); }
        rmSync(tmp, { force: true });
      } else {
        warn(`Could not download photo for ${l.speaker} (${l.photoUrl}). Add images/speakers/${l.slug}.jpg by hand.`);
      }
    }
    l.hasPhoto = existsSync(dest);
  }
}

function writeIfChanged(path, content) {
  const full = join(ROOT, path);
  if (existsSync(full) && readFileSync(full, "utf8") === content) return false;
  writeFileSync(full, content);
  console.log(`✎ ${path}`);
  return true;
}

const csv = csvArg
  ? readFileSync(csvArg, "utf8")
  : await fetch(SHEET_CSV_URL, { headers: { "User-Agent": UA } }).then((r) => {
      if (!r.ok || !(r.headers.get("content-type") || "").includes("csv")) throw new Error(`Sheet fetch failed: HTTP ${r.status}`);
      return r.text();
    });

const lectures = normalizeRows(parseCSV(csv));
if (!lectures.length) throw new Error("Sheet returned no lectures; refusing to overwrite data/lectures.json");
await syncPhotos(lectures);

mkdirSync(join(ROOT, "data"), { recursive: true });
writeIfChanged("data/lectures.json", JSON.stringify(lectures, null, 2) + "\n");

const index = readFileSync(join(ROOT, "index.html"), "utf8");
const marker = /(<!-- LECTURES:START -->)[\s\S]*?(\s*<!-- LECTURES:END -->)/;
if (!marker.test(index)) throw new Error("index.html is missing the LECTURES:START/END markers");
writeIfChanged("index.html", index.replace(marker, (_, a, b) => `${a}${renderLectures(lectures)}${b}`));

console.log(`Synced ${lectures.length} lectures (${lectures.filter((l) => l.videoId).length} with video).`);
