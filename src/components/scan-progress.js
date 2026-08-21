/* Blockchain-scan progress — the slim row (#440 / #443 / #452, Damir's variant A).
 *
 * WHAT THIS REPORTS, AND WHY THE COPY MATTERS. Spixi's TIV runs in `Minimal` mode: it
 * walks block HEADERS against a cuckoo filter of the user's OWN addresses, looking for
 * transactions that involve them. It is NOT downloading a chain. "Syncing the
 * blockchain" oversells it and invites the one question we do not want, so every string
 * here talks about looking for the user's transactions.
 *
 * ★ SHAPE (Damir, on device): a SLIM ROW at the top of the transaction list — ring, one
 * line of text, the percentage, a chevron — that OPENS the "Missing a transaction?"
 * sheet. The full card with the large ring lives in that sheet. The row exists only
 * while there is something to report; when the scan is current the sheet's own pill
 * comes back, because "where is my transaction" is asked hardest AFTER the scan ends.
 *
 * ★ ZERO MEANS UNKNOWN, NOT 0%. `getLastBlockHeight()` is 0 before the first header
 * lands and `determineHighestNetworkBlockNum()` is 0 with no peers — dividing them gives
 * a confident, wrong 0%. The INDETERMINATE state is that moment: a rotating ring and NO
 * percentage. It pairs with the N19 connecting line and resolves to a filling ring the
 * moment both numbers are real.
 *
 * ★ THE ORIGIN IS THE CATCH-UP, NOT THE SESSION (#451). C# persists it: closing the app
 * at 6% and reopening must show 6%, because the scan itself never lost its place —
 * TransactionInclusion.start resumes from the highest stored header. The origin is
 * cleared once current, so a week away is a NEW catch-up that starts at 0%.
 *
 * It STEPS rather than glides: TIV pulls headers 250 at a time. That is honest.
 *
 * createScanProgress+({ strings, onOpen }) -> section, hidden until setScanProgress says
 *   otherwise. onOpen is the tap target: the shell routes it to the missing-tx sheet.
 * setScanProgress(el, { current, target, origin, strings }) -> el
 * scanProgressState(el) -> { state, percent } for whoever needs to mirror it.
 * createScanRing({ size, stroke, showPercent }) -> svg  — shared by the sheet card.
 * setScanRing(svg, { percent, indeterminate })
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

/** Parse a bridge number arg: '' / null / NaN / negative -> 0, meaning UNKNOWN. */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/* ————— the ring, shared by the row and the sheet card ————————————————————————
 * One implementation, two sizes. The row's ring is a MOTION CUE — at 6% its arc is a
 * sliver and the NUMBER beside it is what gets read. The sheet's ring is a real object
 * and carries the number inside. Damir chose both on a render rather than in the
 * abstract, which is the #433 lesson. */
export function createScanRing({ size = 20, stroke = 3, showPercent = false } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('c-scanring');

  const r = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * r;

  const track = document.createElementNS(NS, 'circle');
  track.setAttribute('class', 'c-scanring__track');
  track.setAttribute('cx', String(size / 2));
  track.setAttribute('cy', String(size / 2));
  track.setAttribute('r', String(r));
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke-width', String(stroke));

  const arc = document.createElementNS(NS, 'circle');
  arc.setAttribute('class', 'c-scanring__arc');
  arc.setAttribute('cx', String(size / 2));
  arc.setAttribute('cy', String(size / 2));
  arc.setAttribute('r', String(r));
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke-width', String(stroke));
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', String(circumference));
  arc.setAttribute('stroke-dashoffset', String(circumference));
  arc.setAttribute('transform', 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')');

  svg.append(track, arc);

  let label = null;
  if (showPercent) {
    label = document.createElementNS(NS, 'text');
    label.setAttribute('class', 'c-scanring__label');
    label.setAttribute('x', '50%');
    label.setAttribute('y', '50%');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    svg.append(label);
  }
  svg._ring = { circumference, arc, label };
  return svg;
}

export function setScanRing(svg, { percent = 0, indeterminate = false } = {}) {
  if (!svg || !svg._ring) return svg;
  const { circumference, arc, label } = svg._ring;
  if (indeterminate) {
    svg.dataset.indeterminate = '';
    // a fixed quarter-arc; the CSS rotates the whole ring
    arc.setAttribute('stroke-dashoffset', String(circumference * 0.75));
    if (label) label.textContent = '';
    return svg;
  }
  delete svg.dataset.indeterminate;
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  arc.setAttribute('stroke-dashoffset', String(circumference * (1 - p / 100)));
  if (label) label.textContent = p + '%';
  return svg;
}

/* ————— the slim row ————————————————————————————————————————————————————————— */
export function createScanProgress({ strings = getStrings(), onOpen } = {}) {
  const el = document.createElement('section');
  el.className = 'c-scanprog';
  el.hidden = true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-scanprog__row';
  if (onOpen) btn.addEventListener('click', onOpen);

  const ring = createScanRing({ size: 20, stroke: 3 });

  const text = document.createElement('span');
  text.className = 'c-scanprog__text';
  /* ★ The live region is on the TEXT, not the section. C# pushes at 1 Hz, so a
     section-level region re-announced the whole row once a second for the entire
     catch-up. The text only changes on a STATE change, which is the part worth
     announcing; the percentage is available on demand from the progressbar. */
  text.setAttribute('aria-live', 'polite');
  text.textContent = strings.chainScanTitle || 'Checking for your transactions';

  const pct = document.createElement('span');
  pct.className = 'c-scanprog__pct u-tabular';
  pct.setAttribute('role', 'progressbar');
  pct.setAttribute('aria-valuemin', '0');
  pct.setAttribute('aria-valuemax', '100');
  pct.setAttribute('aria-label', strings.chainScanTitle || 'Checking for your transactions');

  const chev = document.createElement('span');
  chev.className = 'c-scanprog__chev';
  chev.setAttribute('aria-hidden', 'true');
  chev.append(icon('chevron-right', { size: 16 }));

  btn.append(ring, text, pct, chev);
  el.append(btn);
  el._parts = { btn, ring, text, pct };
  return el;
}

/** The row's own reading, for anything that must agree with it (the sheet). */
export function scanProgressState(el) {
  if (!el) return { state: 'done', percent: 100 };
  if (el.hidden) return { state: 'done', percent: 100 };
  return {
    state: el.dataset.state === 'unknown' ? 'unknown' : 'scanning',
    percent: Number(el.dataset.percent) || 0,
  };
}

export function setScanProgress(el, { current, target, origin, strings = getStrings() } = {}) {
  if (!el || !el._parts) return el;
  const { ring, text, pct } = el._parts;

  const cur = num(current);
  let tgt = num(target);
  const org = num(origin);

  /* ★ F6 (2026-08-22, Damir on device) — BELT. C# now converts an implausible target into
     the unknown signal at the push site (HomePage, SCAN_TARGET_STALE_MARGIN), which is the
     real fix. This is the shell's own guard for the same thing, because an OLDER exe pushes
     the raw value and would otherwise reopen the defect against a new shell.

     The device log showed the peer majority reporting a height ~700 000 blocks BELOW ours
     for the first ~40 s of a run. The caught-up test below is `lag <= HIDE_LAG`, and a
     NEGATIVE lag satisfies it — so the row hid itself while the phone was 150 000 blocks
     behind. A target below our own height is not "caught up", it is not known, and this
     component already renders that as indeterminate. */
  const TARGET_STALE_MARGIN = 16;
  /* `clamped` distinguishes MY unknown from C#'s. They are different events and #440 already
     decided what the second one means. */
  let clamped = false;
  if (tgt > 0 && cur > tgt + TARGET_STALE_MARGIN) { tgt = 0; clamped = true; }

  /* ★ WHEN IS A CLIENT "CAUGHT UP".
   * `getHighestKnownNetworkBlockHeight()` is max(our height, a peer majority that is
   * itself extrapolated from the last block's timestamp) — so a fully synced phone reads
   * target = current + 1 for the window between "a block is due" and "TIV fetched it",
   * about once every 30 seconds. With only a `cur >= tgt` test the row appeared at 98%,
   * vanished and reappeared, moving the transaction list each time.
   * So: a LAG THRESHOLD, and it is HYSTERETIC — a wide band to appear, a narrow one to
   * disappear — keyed on whether we were already reporting a SCAN. ⚠ NOT on visibility:
   * the indeterminate state un-hides, and C# guarantees an unknown frame on every boot,
   * so a visibility-keyed test judged the first real frame against the narrow band and
   * rendered 0% on a caught-up phone. */
  const SHOW_LAG = 20;
  const HIDE_LAG = 2;
  /* ★ F6 (audit MINOR) — the hysteresis key must SURVIVE an unknown frame.
     `showing` decides which band we judge against: the narrow HIDE_LAG while a scan is
     already on screen, the wide SHOW_LAG otherwise. It was read from `dataset.state`, and
     the indeterminate branch below overwrites that with 'unknown' — so ONE clamped or
     peerless frame mid-catch-up demoted the state, and the next credible frame was judged
     against SHOW_LAG instead of HIDE_LAG.

     Concretely: 12 blocks behind, row on screen at ~95 %; one stale-peer frame arrives and
     goes indeterminate; the next frame has lag 12, `showing` is now false, `12 <= 20`, so
     the row HIDES while the scan is still running. That is the #446 hysteresis trap, and it
     would have been re-opened by the very belt added to close F6. A separate sticky marker
     records "a scan was in progress" across unknown frames; only a real caught-up or a
     genuine hide clears it. */
  const showing = el.dataset.state === 'scanning' || el.dataset.wasScanning !== undefined;
  if (cur > 0 && tgt > 0) {
    const lag = tgt - cur;
    if (lag <= (showing ? HIDE_LAG : SHOW_LAG)) {
      el.hidden = true;
      delete el.dataset.state;
      delete el.dataset.percent;
      delete el.dataset.wasScanning;   // ★ genuinely caught up — the latch goes with the row
      return el;
    }
  }

  // ★ UNKNOWN. Either end at zero means "we have not been told yet" — never 0%.
  if (cur === 0 || tgt === 0) {
    el.hidden = false;
    el.dataset.state = 'unknown';
    /* ★ F6 vs #440 — the two unknowns are NOT the same event, and conflating them broke a
       break-my-verdict pin that was right.
         · A GENUINE unknown (C# really sent 0/0 — no peers) happens on EVERY boot, before
           any scan frame. #440 MAJOR-1 established that it must NOT carry a scanning state
           forward, or the first real frame is judged against the narrow band and a phone 3-20
           blocks behind renders "0%" on launch. So it clears the latch, exactly as before.
         · A CLAMPED unknown is mine: a real target we refused to believe, mid-catch-up. That
           one must NOT demote, or the next credible frame is judged against SHOW_LAG and the
           row hides at ~95 % while the scan is still running — the #446 trap, re-opened by
           the very belt added to close F6. */
    if (!clamped) delete el.dataset.wasScanning;
    delete el.dataset.percent;
    setScanRing(ring, { indeterminate: true });
    /* ★ COPY (Damir, 2026-08-22): "Connecting" read as "the app has no connection".
     It never meant that — and after the F6 fix it is plainly wrong, because this state now
     also fires while we ARE connected and the peer heights simply are not credible yet.
     "Starting the check" names the same activity as the scanning state and marks it as
     not-yet-underway, so the two read as one sequence rather than two different things. */
    text.textContent = strings.chainScanStarting || 'Starting the check';
    pct.textContent = '';
    pct.removeAttribute('aria-valuenow');
    return el;
  }

  /* The origin is the height this catch-up started from, persisted by C# (#451). An
   * absent or impossible one falls back to the current height, which reads 0% and climbs
   * rather than going negative or past 100. */
  const base = (org > 0 && org < cur) ? org : cur;
  const span = tgt - base;
  const done = cur - base;
  const p = span > 0 ? Math.max(0, Math.min(99, Math.round((done / span) * 100))) : 0;

  el.hidden = false;
  el.dataset.state = 'scanning';
  el.dataset.wasScanning = '';        // ★ F6: sticky across unknown frames (see `showing`)
  el.dataset.percent = String(p);
  setScanRing(ring, { percent: p });
  text.textContent = strings.chainScanTitle || 'Checking for your transactions';
  pct.textContent = p + '%';
  pct.setAttribute('aria-valuenow', String(p));
  return el;
}
