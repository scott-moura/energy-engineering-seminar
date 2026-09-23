# Website Requirements Document — Energy Engineering Seminar, Fall 2026

**Status:** v0.3 (2026-09-23) · **Owner:** Scott Moura · **Build:** Claude Code

## 1. Purpose

A single scrollable page that publishes the recorded lectures from the Fall 2026 edition of UC Berkeley's
Energy Engineering Seminar (ENGIN 93 / CIVENG 298), themed **"Data Centers."** Visitors see every lecture
laid out along a connected "map" and can watch each one without leaving the page. They can also sign up
to hear about future lectures and events.

**Audience:** enrolled students, Berkeley faculty and staff, invited speakers, and the public, including
industry people interested in data-center energy.

## 2. Scope

- **Replaces** the existing "ENGIN 93 Alumni" page in this repo (`index.html`, `styles.css`, `script.js`).
  The old content stays recoverable from git history.
- Covers the Fall 2026 semester only. Multi-semester archives are out of scope for v1.

## 3. Page structure (top to bottom)

| # | Section | Contents |
|---|---------|----------|
| 1 | **Hero** | "Energy Engineering Seminar", course codes ENGIN 93 · CIVENG 298, "Fall 2026: Data Centers", a 2–3 sentence intro on why data centers matter for energy, and a primary button linking to the YouTube playlist. A faint circuit-trace motif. |
| 2 | **Lecture map** | The main feature: lecture cards connected by a circuit-trace path (§4). |
| 3 | **Instructors** | Two side-by-side cards, one each for **Scott Moura** (UC Berkeley CEE) and **Daniel Arnold** (Lead Power Grid Engineer, Lawrence Livermore National Lab; Adjunct Professor, Civil & Environmental Engineering, UC Berkeley; also gives lecture 1; links to LinkedIn, no email). Each has a photo, name, title and affiliation, a 2–3 sentence bio, and profile and email links. |
| 4 | **Newsletter sign-up** | Email field and "Notify me" button. Sign-ups go to a Google Form, which saves them to a Google Sheet (§6.3). |
| 5 | **Footer** | Berkeley Engineering link, contact, © year, playlist link. |

**Links:** YouTube playlist "Fall 2026 Series" on the *Energy Seminar - UC Berkeley* channel:
<https://www.youtube.com/playlist?list=PLRPxPwpZUnWE>

### 3.1 Hero copy (draft)

> **Eyebrow:** Energy Engineering Seminar · Fall 2026 · ENGIN 93 / CIVENG 298
>
> **Headline:** Data Centers
>
> **Sub-headline:** The energy system behind the cloud.
>
> **Intro:** AI and cloud computing are driving a surge in electricity demand, and data centers are where
> that demand lands. Siting and powering these facilities raises hard engineering questions: how to
> connect them to the grid, how to cool them, how much water they use, what they are built from, and how
> to secure them. This semester, researchers and practitioners from Berkeley, the national labs and
> industry take the data center apart one layer at a time, from power systems and planning to cooling,
> water, concrete and cybersecurity.
>
> **Buttons:** ▶ Watch the series (playlist) · ✉ Get lecture updates (scrolls to the newsletter)


## 4. Lecture map

### 4.1 Card content
Each lecture card shows:
- **Lecture date**, placed at the path node next to the card
- **Lecture title**
- **Speaker photo**: circular or rounded-square, consistent size, cropped to the face
- **Speaker name**
- **Speaker title and affiliation**

### 4.2 States
The state comes from the video URL and the date (Pacific time):

| State | Rule | Appearance |
|-------|------|------------|
| **Published** | Video URL present | Full color with a play affordance on hover. Clicking or pressing Enter opens the video modal (§4.4). Solid node. |
| **Recording coming soon** | Date has passed, no video yet | Muted colors, "Recording coming soon" tag, not clickable. Hollow node. |
| **Today** | Date is today | Gold "Today" tag and gold node. |
| **Upcoming** | Future date | Muted colors, "Upcoming" tag, not clickable. Hollow node on a dotted trace. |

- A missing title shows as "Title TBA".
- A missing photo shows the speaker's initials on a Berkeley Blue tile.

### 4.3 Circuit-trace path (the "map")
- The cards are joined by a path styled as a **PCB trace or fiber run**: right-angle bends, rounded corners, and
  node "pads" (small squares or chips) at each lecture. The design stays subtle, conveying the theme through
  detail rather than decoration.
- The segment is solid Berkeley Blue between published lectures and a dotted gray line into coming-soon
  lectures, so the path shows how far through the semester we are.
- **Desktop (≥ 900px):** cards alternate left and right of a central trace that jogs between them.
- **Mobile (< 900px):** collapses to a single left-hand rail with the nodes and dates on the rail and the
  cards to the right (Luma-style).
- Drawn as inline SVG that is recomputed on resize, so no image assets are needed.
- Motion is limited to a gentle fade-in of cards on scroll, and is disabled when `prefers-reduced-motion` is set.

### 4.4 Video modal
- An in-page modal with a 16:9 YouTube embed that uses `youtube-nocookie.com` and autoplays on open.
- Shows the lecture title, speaker name and affiliation, and a "Watch on YouTube ↗" link.
- Closes with Esc, a backdrop click or the ✕ button. It traps focus while open and returns focus to the card
  when closed. Closing stops playback.
- The URL hash updates (e.g. `#lecture-3`), so a specific lecture can be linked directly and the link opens
  its modal.

## 5. Visual design

- **Theme:** light, following the Berkeley brand. The background is white or warm off-white, with
  **Berkeley Blue `#003262`** as the primary color and **California Gold `#FDB515`** as the accent.
  Neutral grays are used for coming-soon states.
- **Typography:** Inter (or Berkeley's web font stack) for UI and body text, and optionally a serif display
  face for the hero title.
- **Data-center accents (subtle):** the circuit-trace path, node pads, a faint grid or rack-line pattern
  in the hero, and a small "status LED" dot on published cards.
- **Responsive:** looks correct from 360px to 1600px wide, with no horizontal scrolling.
- **Accessibility:** WCAG 2.1 AA contrast, full keyboard operability, alt text on every photo, and
  semantic landmarks. Decorative SVG is marked `aria-hidden`.

## 6. Data and content management

### 6.1 Lecture Sheet (source of truth)
Google Sheet **F26-Lineup-Data** (`1sCNdiStJb-yHKFvDT8rEG2PB440N_zsLcCN_3jDh4lM`), tab `Sheet1`, one row
per lecture. The sync script matches columns by header name, so columns can be reordered but must not be
renamed.

| Column | Status | Required | Notes |
|--------|--------|----------|-------|
| `Week` | existing | ✓ | Sort order and `#lecture-N` anchor |
| `Date` | existing | ✓ | M/D/YYYY |
| `Speaker` | existing | ✓ | |
| `Speaker Title` | **add** | ✓ | Job title, e.g. "Research Scientist". The cards need it. |
| `Affiliation` | existing | ✓ | `Org \| Unit` is rendered as two lines (org, then unit) |
| `Title` | existing | — | Blank shows "Title TBA" |
| `Photo URL` | existing | — | Source image. Used to fetch the photo into the repo (§6.4). |
| `Video URL` | existing | — | Blank means not yet published. `youtu.be/…` and `youtube.com/watch?v=…` both work. |
| `Show` | **add** (optional) | — | Put `No` to hide a row without deleting it. Blank means shown. |

**Access:** the sheet is currently private to its owner. The nightly sync and the live refresh both need it
available through **File → Share → Publish to web → Sheet1 → CSV**. Publishing makes only the lecture data
public; the newsletter responses stay in a separate file. If Berkeley's Workspace blocks Publish to web, the
fallback is a Google service account with read-only access used by the nightly Action, with no live refresh.

### 6.2 Snapshot and live refresh
- A **GitHub Action runs nightly** (and on manual dispatch). It downloads the published CSV, validates it,
  writes `data/lectures.json` and commits only if something changed.
- The page **renders instantly from `data/lectures.json`**, then fetches the live CSV in the background and
  re-renders if the live data differs. If the Sheet is unreachable, the snapshot stays on screen and no
  error is shown.
- The Action also pre-renders the lecture cards into `index.html`, so search engines and no-JS visitors see
  the content.

### 6.3 Newsletter sign-ups
- The page's own sign-up form mirrors the Google Form *Energy Engineering Lecture Series Newsletter Signup*
  (`1FAIpQLSdYnRFEaWMHgcV6H30q3izkdG9vRXAObfNpKinXQJ2unNn_kQ`) and posts to its `formResponse` endpoint,
  so visitors never see Google's form UI:
  - Full Name → `entry.1334271877`
  - Email Address → `entry.580700825` (the page requires this one)
  - Affiliation → `entry.97263047`, a choice of Undergraduate Student, Graduate Student, Faculty / Staff,
    Alumni, or Community Member / Other
- The page shows an inline success or error message and does basic email validation. A hidden honeypot field
  deters spam.
- The Form opens for visitors who aren't signed in (checked 2026-09-23). If a field is added or renamed in
  the Form, its entry ID changes and the page must be updated.
- Scott sends the emails manually for now.

### 6.4 Speaker photos
- **v1:** photos are committed to `/images/speakers/<slug>.jpg`, where the slug comes from the speaker's name
  (e.g. `will-mcneil.jpg`). They are normalized to a square 600×600 JPEG under 150 KB.
- **Photo URL check (2026-09-23):**
  - Smith and McNeil download fine.
  - Arnold's URL is missing its `.png` extension; the corrected URL works.
  - Wetter's and Chojkiewicz's `lbl.gov/person-image/…` links sit behind a Cloudflare bot check, so
    scripts get HTTP 403.
  - Rows 6–13 have no photo yet.
- **Phase 2 (planned):** a TA submits the lecture details plus a photo URL through a Google Form or Sheet. The
  nightly Action downloads any new `photo_url`, resizes it, saves it to `/images/speakers/<slug>.jpg`, fills
  commits. After that, adding a lecture needs no repo access. **Constraint:** the ingestion script can't
  get past bot-protected hosts such as LBL's person-image pages. For those, the TA uploads the photo file
  itself (e.g. through a Form file-upload question). If a download fails, the Action posts a GitHub issue
  and the card falls back to initials.

## 7. Technical architecture

- **Static site** of plain HTML, CSS and vanilla JS with no framework or bundler, which keeps it easy for
  future TAs to maintain.
- **Hosting:** GitHub Pages, deployed from `main` through a GitHub Actions Pages workflow.
- **Build and sync script:** a small Node or Python script used by the nightly Action (CSV → JSON,
  pre-render, photo resize).
- **Suggested repo layout:**
  ```
  index.html
  assets/css/styles.css
  assets/js/main.js          # render, circuit path, modal, newsletter
  data/lectures.json         # nightly snapshot
  images/speakers/
  images/instructor/
  scripts/sync-sheet.(js|py)
  .github/workflows/sync.yml    # nightly Sheet → repo
  .github/workflows/pages.yml   # deploy
  ```
- **Third-party calls at runtime:** Google Sheets CSV (read), Google Forms (sign-up post), and the YouTube
  embed (only when a modal opens). No analytics in v1.
- **URL:** `https://scott-moura.github.io/energy-engineering-seminar/` (default GitHub Pages address).
- **Performance targets:** Lighthouse ≥ 90 in every category, a page weight under 1 MB before any video
  loads, and lazy-loaded photos.

## 8. Out of scope (v1)

Visitor analytics, multi-semester archive, logistics/enrollment section, search or filtering, comments, a custom analytics
dashboard, automated email sending, a dark theme, and a custom domain.

## 9. Decisions and open items

**Decided (2026-09-23):** lecture data comes from F26-Lineup-Data, Claude drafted the hero copy (§3.1),
there are two instructors (Moura and Arnold), the site uses the default GitHub Pages URL, the newsletter uses Google Form → Sheet, there are no
analytics in v1, and the prior contributor's name is removed from all files (git history is left as-is). The two blocked LBL photos
will be saved through the in-app browser, with approval for each download.

**Resolved (later on 2026-09-23):** the `Speaker Title` column was added; the sheet is readable through its
export URL; the newsletter Form was created; Dan's title and profile link were supplied.

**Open:**
1. Row 1's `Photo URL` is missing `.png` at the end. The sync script tries adding it, but it's better fixed
   in the sheet.
2. Missing photos: rows 6–13.
3. Scott to review the instructor bios Claude drafted.

## 10. Build phases

1. **Phase 1 (built 2026-09-23, awaiting review):** Page built from the live sheet data: hero, circuit-trace lecture map, modal,
   instructor, newsletter UI, responsive and accessibility pass. *Review with Scott.*
2. **Phase 1b:** Wire up the Google Sheet (snapshot and live refresh), the newsletter Form, the nightly
   Action and the Pages deploy.
3. **Phase 2:** TA submission form and automated photo ingestion.
