/**
 * c-word-tip — ★ V1A-M (M2, Damir's dial 2026-10-15: tips ONLY "contact request" and "no phone book", style A = the quiet
 * card). A one-line explanation of a NEW WORD, shown in place the first time the word is on the Chats screen, until the
 * user closes it with ✕. Two ids: `wordrequest` (under the first incoming contact-request card) and `wordphonebook` (under
 * the body text of the empty Chats state). The host (home.html) decides WHERE and WHEN (cap `wordtips` = C# flag V1Hints,
 * a setHints push with off:false, the id not done, at most one, never beside a glass hint / update / backup / rating card
 * or a moment sheet); this file only builds the element and reads the done ids.
 * C# stores done in SHints (`ixian:hint:done:<id>`; the two ids are S11HintRules.WordIds, which S11HintRules.isTipId admits —
 * they are NOT in TipIds, the glass-hint list); a word tip NEVER sends `shown` (the weekly glass-hint rotation must not move).
 * No storage here — never a `spixi.*` key (#383).
 *
 *   WORD_TIP_IDS                        — ['wordrequest', 'wordphonebook']
 *   wordTipCopy(id, strings)            → the text ('' for an unknown id)
 *   createWordTip({ id, strings, onClose }) → the element (role="note"), or null for an unknown id. Text via textContent.
 *                                          ✕ (aria-label strings.close, aria-describedby → the tip's text, #46 r1 B-NIT-4)
 *                                          calls onClose(id, { hadFocus }) ONCE; the HOST moves the focus (#46 r1 B-MINOR-5).
 *   wordTipsDone(json)                  → Set of the word ids in the RAW setHints push's `done` array (anything malformed →
 *                                          an empty set). parseHintsState keeps only the glass-hint ids, so it cannot carry them.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export const WORD_TIP_IDS = ['wordrequest', 'wordphonebook'];
let wtSeq = 0;

/** The copy — explicit `strings.key || 'English'` lines so extract-strings sees both keys. */
export function wordTipCopy(id, strings = getStrings()) {
  switch (id) {
    case 'wordrequest': return strings.wordTipRequest || 'A contact request means someone wants to chat with you. You choose: accept or decline.';
    case 'wordphonebook': return strings.wordTipPhonebook || 'Spixi has no phone book. Add people with their Spixi address or QR code.';
    default: return '';
  }
}

export function createWordTip({ id, strings = getStrings(), onClose } = {}) {
  const text = wordTipCopy(id, strings);
  if (!text) return null;
  const el = document.createElement('div');
  el.className = 'c-word-tip';
  el.dataset.tip = id;
  el.setAttribute('role', 'note');

  const glyph = document.createElement('span');
  glyph.className = 'c-word-tip__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.append(icon('info-circle', { size: 20 }));

  const p = document.createElement('p');
  p.className = 'c-word-tip__text';
  p.textContent = text;
  wtSeq += 1;
  p.id = 'c-word-tip-t' + wtSeq;

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'c-word-tip__close';
  x.setAttribute('aria-label', strings.close || 'Close');
  x.setAttribute('aria-describedby', p.id);   // "Close" + the tip's text: a screen reader hears WHAT closes (no new string)
  x.append(icon('x', { size: 20 }));
  let closed = false;
  x.addEventListener('click', () => {
    if (closed) return;                          // one ✕ = one done verb
    closed = true;
    /* #46 r1 B-MINOR-5: the host removes the tip and moves the focus to the next sensible control when the tip held it */
    let hadFocus = false;
    try { hadFocus = el.contains(document.activeElement); } catch (e) {}
    try { if (onClose) onClose(id, { hadFocus }); } catch (e) { /* the host's bookkeeping */ }
  });

  el.append(glyph, p, x);
  return el;
}

/** PURE — the word ids already done, from the RAW setHints JSON (same 4096-char cap as parseHintsState). */
export function wordTipsDone(json) {
  const out = new Set();
  let o = json;
  try {
    if (typeof json === 'string') {
      if (json.length > 4096) return out;
      o = JSON.parse(json);
    }
  } catch (e) { return out; }
  if (!o || typeof o !== 'object' || Array.isArray(o) || !Array.isArray(o.done)) return out;
  for (const d of o.done) if (WORD_TIP_IDS.indexOf(d) >= 0) out.add(d);
  return out;
}
