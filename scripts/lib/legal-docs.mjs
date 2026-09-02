/**
 * ★ Session I (#733 — "the FULL legal documents ship in-app").
 *
 * Bakes docs/legal/privacy-policy.md + docs/legal/terms-of-use.md into a GENERATED
 * component source, src/components/legal-docs.js, at BUILD TIME (a build-step read,
 * never a hand copy — the two hand-written summaries this replaces drifted from the
 * policy within a month: TERMS_DEFAULT still claimed "IXI Labs collects no personal
 * data" after #730 had fixed the same claim on the privacy side).
 *
 * The output dialect is openDocSheet's (launch-shell.js): one line = one block.
 *   `# `  heading · `## ` sub-heading · `- ` bullet · `1. ` numbered · blank = break ·
 *   anything else = paragraph. Inline: `**bold**` and `[label](https://…)` only.
 * Markdown the docs use that the sheet has no shape for is converted HERE, once:
 *   `## n. Title` → `# n. Title` · `### 4.1 x` → `## 4.1 x` · the `# Title` line and
 *   `---` rules are dropped (the sheet has its own title) · `> quote` → paragraph ·
 *   tables → one bullet per body row, cells joined with ' — ', first cell bold ·
 *   `*italic*` / `` `code` `` → plain (the sheet is prose, not a rendering of markdown).
 * Everything else — the WORDS — passes through byte-for-byte. This step never edits
 * legal copy; the copy lives in docs/legal and is Damir's.
 *
 * ★ THE HOLD (Damir 2026-09-02, ruling on the placeholder gate): a document that still
 * carries an EDITORIAL MARKER is not a document a user can be asked to accept. Such a
 * document is HELD — the bake emits `null` for it and a `hold` reason, launch-shell
 * falls back to the #730 honest summary for that ONE document, and the bundle build +
 * the smoke suite print the hold as a 🟡 line. No env flag, no manual switch: the day
 * the marker leaves the markdown, the next bundle build ships the full document.
 * Markers: `⟨…⟩` placeholders (the retention period, §4.3/§11) and session/decision
 * annotations ("(Updated Session G/#708: …)" in §4.4 — internal history that must not
 * be read by a user as part of the policy).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LEGAL_SOURCES = {
  terms: 'docs/legal/terms-of-use.md',
  privacy: 'docs/legal/privacy-policy.md',
};

/** Editorial markers that HOLD a document out of the bundle. Each: [regex, reason]. */
export const HOLD_MARKERS = [
  [/[⟨⟩]/, 'a ⟨PLACEHOLDER⟩ is still in the text'],
  [/PLACEHOLDER|DAMIR TO CONFIRM/, 'a PLACEHOLDER / DAMIR TO CONFIRM note is still in the text'],
  [/\(Updated Session [A-Z]\b|Session [A-Z]\/#\d+/, 'a session/decision annotation ("Updated Session …/#…") is still in the text'],
];

/** Every hold reason for a markdown text, with the first offending line number. */
export function holdReasons(md) {
  const lines = md.split('\n');
  const out = [];
  for (const [re, reason] of HOLD_MARKERS) {
    const i = lines.findIndex((l) => re.test(l));
    if (i !== -1) out.push(reason + ' (line ' + (i + 1) + ')');
  }
  return out;
}

const inlinePlain = (s) => s
  .replace(/`([^`]*)`/g, '$1')                        // `code` → plain
  .replace(/(^|[^*])\*(?!\*)([^*\n]+?)\*(?!\*)/g, '$1$2') // *italic* → plain (never touches **bold**)
  .replace(/[ \t]+$/g, '');

/** Markdown (the docs/legal subset) → the openDocSheet line dialect. */
export function toSheetDialect(md) {
  const src = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const push = (l) => out.push(l);
  while (i < src.length) {
    const line = src[i];
    if (/^# /.test(line)) { i++; continue; }                 // document title: the sheet has its own
    if (/^---\s*$/.test(line)) { i++; continue; }            // rule
    if (/^\|/.test(line)) {                                   // table block
      const rows = [];
      while (i < src.length && /^\|/.test(src[i])) { rows.push(src[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\|\s*:?-+/.test(r)).slice(1); // drop header + separator
      for (const r of body) {
        const c = cells(r).map(inlinePlain).filter((x) => x.length);
        if (!c.length) continue;
        const head = /^\*\*/.test(c[0]) ? c[0] : '**' + c[0] + '**';
        push('- ' + [head, ...c.slice(1)].join(' — '));
      }
      push('');
      continue;
    }
    if (/^## /.test(line)) { push('# ' + inlinePlain(line.slice(3))); i++; continue; }
    if (/^### /.test(line)) { push('## ' + inlinePlain(line.slice(4))); i++; continue; }
    if (/^> /.test(line)) { push(inlinePlain(line.slice(2))); i++; continue; }
    if (/^- /.test(line)) { push('- ' + inlinePlain(line.slice(2))); i++; continue; }
    if (/^\d+\. /.test(line)) { push(inlinePlain(line)); i++; continue; }
    if (!line.trim()) { push(''); i++; continue; }
    push(inlinePlain(line));
    i++;
  }
  // collapse runs of blank lines; trim ends
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
  return text;
}

/**
 * Bake both documents. Returns { docs: { terms: {text|null, hold: string[]} , … },
 * source: the generated legal-docs.js text }.
 */
export function bakeLegalDocs(root) {
  const docs = {};
  for (const [key, rel] of Object.entries(LEGAL_SOURCES)) {
    const md = readFileSync(join(root, rel), 'utf8');
    const hold = holdReasons(md);
    const text = hold.length ? null : toSheetDialect(md);
    if (text !== null) {
      for (const [re] of HOLD_MARKERS) if (re.test(text)) throw new Error(rel + ': a hold marker survived the bake — the converter is wrong');
      if (text.indexOf(String.fromCharCode(0)) !== -1) throw new Error(rel + ': NUL in source');
    }
    docs[key] = { text, hold, source: rel };
  }
  const lit = (v) => JSON.stringify(v);
  const source = `/* GENERATED by scripts/build-legal-docs.mjs from docs/legal — DO NOT EDIT.
 * ★ #733: the FULL legal documents, baked at build time (scripts/lib/legal-docs.mjs).
 * A document with an editorial marker still in it is HELD (text = null, hold = why);
 * launch-shell falls back to its honest summary for that one document until the
 * marker leaves docs/legal. Rebuild: node scripts/build-legal-docs.mjs (build-demo-bundle
 * runs it first, so a bundle can never carry a stale copy). */
export const LEGAL_DOCS = {
${Object.entries(docs).map(([k, d]) => `  ${k}: { text: ${lit(d.text)}, hold: ${lit(d.hold)}, source: ${lit(d.source)} },`).join('\n')}
};
`;
  return { docs, source };
}

/** One-line status per document, for build logs and the smoke suite. */
export function describeLegalDocs(docs) {
  return Object.entries(docs).map(([k, d]) => d.text === null
    ? `🟡 legal ${k}: HELD — ${d.hold.join('; ')} (the in-app sheet keeps the summary until docs/legal is clean)`
    : `legal ${k}: baked, ${d.text.length} chars, ${(d.text.match(/^# /gm) || []).length} sections`).join('\n');
}
