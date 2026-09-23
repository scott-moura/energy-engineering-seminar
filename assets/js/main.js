import { SHEET_CSV_URL, normalizeRows, parseCSV, todayPacific } from "./data.js";
import { renderLectures } from "./render.js";

const FORM_ID = "1FAIpQLSdYnRFEaWMHgcV6H30q3izkdG9vRXAObfNpKinXQJ2unNn_kQ";
const FORM_FIELDS = { email: "entry.580700825", name: "entry.1334271877", affiliation: "entry.97263047" };

const list = document.getElementById("lecture-list");
const route = document.querySelector(".route");
const trace = document.querySelector(".route__trace");
const mobile = window.matchMedia("(max-width: 899px)");
let lectures = [];
let handledInitialHash = false;

// ---------- Lecture list ----------

function render(next) {
  lectures = next;
  list.innerHTML = renderLectures(lectures, todayPacific());
  list.querySelectorAll(".card__photo img").forEach((img) => {
    const drop = () => img.remove(); // fall back to initials
    if (img.complete && img.naturalWidth === 0) drop();
    else img.addEventListener("error", drop, { once: true });
  });
  observeReveal();
  drawTrace();
  if (!handledInitialHash) { handledInitialHash = true; openFromHash(); }
}

async function loadSnapshot() {
  const res = await fetch("data/lectures.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
  return res.json();
}

// Pull the live sheet so edits show up before the nightly sync. Photos only exist once the sync has run,
// so keep the snapshot's knowledge of which photos exist.
async function loadLive(snapshot) {
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`sheet HTTP ${res.status}`);
  const known = new Map(snapshot.map((l) => [l.slug, l.hasPhoto]));
  return normalizeRows(parseCSV(await res.text())).map((l) => ({ ...l, hasPhoto: known.get(l.slug) }));
}

const visibleFields = (ls) => JSON.stringify(ls.map(({ photoUrl, ...rest }) => rest));

async function init() {
  let snapshot = [];
  try { snapshot = await loadSnapshot(); render(snapshot); }
  catch (e) { console.warn("Lecture snapshot unavailable:", e); }
  try {
    const live = await loadLive(snapshot);
    if (live.length && visibleFields(live) !== visibleFields(snapshot)) render(live);
  } catch (e) {
    console.info("Live sheet unavailable; showing snapshot.", e);
    if (!snapshot.length) observeReveal(), drawTrace(); // keep the pre-rendered markup usable
  }
}

// ---------- Circuit trace ----------

const SVG = "http://www.w3.org/2000/svg";
function el(name, attrs) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function drawTrace() {
  const nodes = [...list.querySelectorAll(".stop__node")];
  trace.replaceChildren();
  if (!nodes.length) return;
  const box = route.getBoundingClientRect();
  const pts = nodes.map((n) => {
    const r = n.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, half: r.height / 2 };
  });
  const powered = nodes.map((n) => !n.closest(".stop").classList.contains("is-upcoming"));
  const small = mobile.matches;
  const jogBase = small ? 10 : 18;

  const segment = (d, on) => trace.append(el("path", { d, class: `seg seg--${on ? "on" : "off"}` }));
  const via = (x, y, on) => trace.append(el("circle", { cx: x, cy: y, r: 4, class: `via via--${on ? "on" : "off"}` }));

  // Lead-in from the section heading
  const first = pts[0];
  const lead = small ? 28 : 56;
  segment(`M${first.x} ${first.y - lead} V${first.y - first.half}`, true);
  via(first.x, first.y - lead, true);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const on = powered[i + 1];
    const x = a.x;
    const top = a.y + a.half, bottom = b.y - b.half;
    const span = bottom - top;
    const j = small ? jogBase : (i % 2 ? jogBase : -jogBase);
    const d = Math.min(Math.abs(j), span / 4);
    const y1 = top + span * 0.28, y2 = bottom - span * 0.28;
    // Down, 45° jog out, down, 45° jog back — like a PCB trace routed around a component.
    segment(`M${x} ${top} V${y1} L${x + Math.sign(j) * d} ${y1 + d} V${y2 - d} L${x} ${y2} V${bottom}`, on);
    via(x + Math.sign(j) * d, (y1 + y2) / 2, on);
  }

  const last = pts[pts.length - 1];
  segment(`M${last.x} ${last.y + last.half} V${last.y + 64}`, false);
  trace.append(el("rect", { x: last.x - 7, y: last.y + 64, width: 14, height: 14, rx: 3, class: "via via--off" }));
}

new ResizeObserver(() => drawTrace()).observe(route);
mobile.addEventListener("change", drawTrace);

// ---------- Scroll reveal ----------

let revealer;
function observeReveal() {
  revealer?.disconnect();
  const stops = list.querySelectorAll(".stop");
  if (!("IntersectionObserver" in window)) { stops.forEach((s) => s.classList.add("is-visible")); return; }
  revealer = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); revealer.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  stops.forEach((s) => revealer.observe(s));
}

// ---------- Video modal ----------

const player = document.getElementById("player");
const frame = document.getElementById("player-frame");

function openVideo(week) {
  const l = lectures.find((x) => x.week === week && x.videoId);
  if (!l) return false;
  document.getElementById("player-week").textContent = `Week ${l.week} · ${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${l.date}T12:00:00Z`))}`;
  document.getElementById("player-title").textContent = l.title || "Title TBA";
  document.getElementById("player-speaker").textContent = [l.speaker, l.speakerTitle, l.org].filter(Boolean).join(" · ");
  document.getElementById("player-youtube").href = `https://www.youtube.com/watch?v=${l.videoId}`;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${l.videoId}?autoplay=1&rel=0&modestbranding=1`;
  iframe.title = `${l.title} — ${l.speaker}`;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.replaceChildren(iframe);
  if (!player.open) player.showModal();
  history.replaceState(null, "", `#lecture-${l.week}`);
  return true;
}

function openFromHash() {
  const m = location.hash.match(/^#lecture-(\d+)$/);
  if (!m) return;
  const week = Number(m[1]);
  document.getElementById(`lecture-${week}`)?.scrollIntoView({ block: "center" });
  openVideo(week);
}

list.addEventListener("click", (e) => {
  const link = e.target.closest(".card__link");
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return; // let modified clicks open YouTube
  if (openVideo(Number(link.dataset.week))) e.preventDefault();
});
player.addEventListener("click", (e) => {
  if (e.target === player || e.target.closest("[data-close]")) player.close();
});
player.addEventListener("close", () => {
  frame.replaceChildren(); // stops playback
  const week = location.hash.match(/^#lecture-(\d+)$/)?.[1];
  // Opened from a deep link there was no trigger to return focus to, so focus the lecture card.
  if (week && document.activeElement === document.body) document.querySelector(`#lecture-${week} .card__link`)?.focus({ preventScroll: true });
  history.replaceState(null, "", location.pathname + location.search);
});
window.addEventListener("hashchange", openFromHash);

// ---------- Newsletter ----------

const form = document.getElementById("signup");
const status = form.querySelector(".signup__status");
const fields = form.elements;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = fields.email.value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  fields.email.setAttribute("aria-invalid", String(!valid));
  status.classList.toggle("is-error", !valid);
  if (!valid) { status.textContent = "Please enter a valid email address."; fields.email.focus(); return; }

  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "Signing you up…";
  try {
    if (!fields.website.value) { // honeypot: bots fill every field
      const body = new URLSearchParams({ [FORM_FIELDS.email]: email, [FORM_FIELDS.name]: fields.name.value.trim() });
      if (fields.affiliation.value) body.set(FORM_FIELDS.affiliation, fields.affiliation.value);
      // Google Forms doesn't send CORS headers; an opaque no-cors response means the request was delivered.
      await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, { method: "POST", mode: "no-cors", body });
    }
    form.classList.add("is-done");
    form.innerHTML = `<p class="signup__thanks" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fdb515"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#010133" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span><strong>You're on the list.</strong><br>We'll email ${email.replace(/[<>&"]/g, "")} when new lectures and events are posted.</span></p>`;
  } catch {
    button.disabled = false;
    status.classList.add("is-error");
    status.innerHTML = `Something went wrong. Please try again, or <a href="https://docs.google.com/forms/d/e/${FORM_ID}/viewform" target="_blank" rel="noopener" style="color:#fff">sign up on Google Forms</a>.`;
  }
});

// ---------- Chrome ----------

document.getElementById("year").textContent = new Date().getFullYear();
const topbar = document.querySelector(".topbar");
const onScroll = () => topbar.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

init();
