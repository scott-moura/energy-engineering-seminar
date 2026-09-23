// HTML templates for the lecture map, shared by the browser and the sync script's pre-render step.
import { lectureStatus, todayPacific } from "./data.js";

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmt = (iso, opts) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(`${iso}T12:00:00Z`));

export const initials = (name) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const TAGS = {
  published: '<span class="tag tag--published"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z"/></svg>Watch lecture</span>',
  today: '<span class="tag tag--today">Today</span>',
  processing: '<span class="tag tag--muted">Recording coming soon</span>',
  upcoming: '<span class="tag tag--muted">Upcoming</span>',
};

export function renderLecture(l, index, today = todayPacific()) {
  const status = lectureStatus(l, today);
  const side = index % 2 === 0 ? "left" : "right";
  const title = l.title || "Title TBA";
  const role = [l.speakerTitle, l.org].filter(Boolean).join(" · ");
  const photo = l.hasPhoto === false
    ? ""
    : `<img src="${esc(l.photo)}" alt="" width="96" height="96" loading="lazy" decoding="async">`;
  const link = status === "published"
    ? `<a class="card__link" href="https://www.youtube.com/watch?v=${esc(l.videoId)}" data-video="${esc(l.videoId)}" data-week="${l.week}">
        <span class="visually-hidden">Watch “${esc(title)}” by ${esc(l.speaker)}</span></a>`
    : "";

  return `
    <li class="stop stop--${side} is-${status}" id="lecture-${l.week}" data-week="${l.week}">
      <div class="stop__date">
        <time datetime="${l.date}"><span class="stop__dow">${fmt(l.date, { weekday: "short" })}</span> ${fmt(l.date, { month: "short", day: "numeric" })}</time>
        <span class="stop__week">Week ${l.week}</span>
      </div>
      <div class="stop__node" aria-hidden="true"></div>
      <article class="card">
        ${link}
        <div class="card__photo" data-initials="${esc(initials(l.speaker))}">${photo}</div>
        <div class="card__body">
          ${TAGS[status]}
          <h3 class="card__title">${esc(title)}</h3>
          <p class="card__speaker">${esc(l.speaker)}</p>
          <p class="card__role">${esc(role)}${l.unit ? `<span class="card__unit">${esc(l.unit)}</span>` : ""}</p>
        </div>
      </article>
    </li>`;
}

export const renderLectures = (lectures, today = todayPacific()) =>
  lectures.map((l, i) => renderLecture(l, i, today)).join("");
