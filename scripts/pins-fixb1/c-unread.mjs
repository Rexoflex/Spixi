/* ==== fixb1 item 3 (#1646) — desktop chat: the "Unread messages" strip has ONE equal inset on both sides ====
 * Mechanism (docs/fixb1-mechanisms.md, item 3): the log `#messages.messages.u-scroll` reserved its scroll-bar gutter on the END
 * edge only (base.css .u-scroll `scrollbar-gutter: stable`, pointer devices), so the strip — which pulls itself back over the
 * 760 column padding with a negative margin — stopped one gutter short on the right, and the whole column sat half a gutter
 * left of the pane's centre. Fix: on the desktop the log reserves BOTH edges (`stable both-edges`).
 * This is the SMOKE half: a SOURCE pin on the BUILT chat shell's CSS (comment-stripped, #771 declared). The MEASURED half is
 * scripts/pins-fixb1/c-unread-sweep.mjs (Chromium, run by hand).
 *   (1) the both-edges rule exists on `:root[data-desktop] .messages`, INSIDE the pointer media `(hover: hover) and (pointer: fine)`
 *       (the same scope as base.css .u-scroll — a touch-only desktop keeps its overlay bar);
 *   (2) it is the ONLY `scrollbar-gutter` rule on #messages / .messages in the shell's own style blocks, and no phone-scope
 *       (not under :root[data-desktop]) rule in the shell sets `both-edges`;
 *   (3) the strip's margin rule is unchanged (`margin-inline: calc(-1 * max(0px, (100vw - 760px) / 2))`) and pairs with the
 *       log's padding rule (`max(0px, calc((100% - 760px) / 2))`) — the two 760 literals;
 *   (4) base.css `.u-scroll` (the shared sheet) still says `scrollbar-gutter: stable` (NOT both-edges) — phones and every other
 *       scroller are untouched.
 * Deliberate breaks (fixb1 report): `both-edges` → `stable` in src/shells/chat.html (+ build-shells) → (1) fails;
 *   the 760 in the strip's margin → 780 → (3) fails; `both-edges` added to base.css `.u-scroll` → (4) fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const html = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8');
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => stripCssComments(m[1])).join('\n');
  const flat = styles.replace(/\s+/g, ' ');
  const base = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.base.css'), 'utf8')).replace(/\s+/g, ' ');

  const POINTER = String.raw`@media \(hover: hover\) and \(pointer: fine\) \{`;
  const gutterRule = new RegExp(POINTER + String.raw` :root\[data-desktop\] \.messages \{ scrollbar-gutter: stable both-edges; \} \}`);
  const rule1 = gutterRule.test(flat);

  /* every rule block (selector { body }) of the shell's styles that sets scrollbar-gutter — walk the flat text */
  const gutterDecls = [];
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*scrollbar-gutter[^{}]*)\}/g)) gutterDecls.push({ sel: m[1].trim(), body: m[2].trim() });
  const onMessages = gutterDecls.filter((g) => /[.#]messages\b/.test(g.sel));
  const bothEdgesAnywhere = gutterDecls.filter((g) => /both-edges/.test(g.body));
  const phoneBoth = bothEdgesAnywhere.filter((g) => !/:root\[data-desktop\]/.test(g.sel));
  const rule2 = onMessages.length === 1 && /^:root\[data-desktop\] \.messages$/.test(onMessages[0].sel)
    && /^scrollbar-gutter: stable both-edges;?$/.test(onMessages[0].body) && phoneBoth.length === 0;

  const strip = /:root\[data-desktop\] \.c-unread-divider \{ margin-inline: calc\(-1 \* max\(0px, \(100vw - 760px\) \/ 2\)\); \}/.test(flat);
  const pad = /:root\[data-desktop\] \.messages \{ padding-inline: max\(0px, calc\(\(100% - 760px\) \/ 2\)\); \}/.test(flat);
  const rule3 = strip && pad;

  const uScroll = /@media \(hover: hover\) and \(pointer: fine\) \{ \.u-scroll \{[^}]*scrollbar-gutter: stable;[^}]*\}/.test(base) && !/\.u-scroll \{[^}]*both-edges/.test(base);

  ok(rule1, '★ fixb1 item 3 (#1646): the BUILT chat shell has `:root[data-desktop] .messages { scrollbar-gutter: stable both-edges }` INSIDE the pointer media (hover: hover) and (pointer: fine)');
  ok(rule2, `★ fixb1 item 3: that is the ONLY scrollbar-gutter rule on the chat log, and no rule outside :root[data-desktop] sets both-edges (phones untouched) — ${JSON.stringify({ onMessages, phoneBoth })}`);
  ok(rule3, `★ fixb1 item 3: the strip's margin rule is unchanged and pairs with the log's padding rule (the two 760 literals) — ${JSON.stringify({ strip, pad })}`);
  ok(uScroll, '★ fixb1 item 3: base.css .u-scroll still reserves the gutter on the end edge only (`stable`, inside the pointer media) — every other scroller and every phone is untouched');
}
