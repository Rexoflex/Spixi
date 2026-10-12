/* ==== ★ S11 A2 (#1263, R3-MINOR-1) — the hints switch on the BUILT settings shell (★ S18 D1 RE-BASE: Notifications) ====
 * ★ S18 D1 RE-BASE (S17 walk, #1362 interview — Damir 17:2x): the switch MOVED from Chat appearance card (5) to the
 * Notifications screen (its own card after the notification cards); the clauses below are unchanged otherwise. The caps
 * carry `globalNotifications` (C# always sends it — SettingsPage caps) so the Notifications row exists.
 *   · an exe WITHOUT the `hints` cap → no switch (an older exe has no ixian:hintsoff branch);
 *   · with it: "Tips on the Chats screen" sits on Notifications (NOT in Chat appearance); setHintsOff('False') (C#: hints not off)
 *     → the switch is ON; a tap sends ixian:hintsoff:1 (the verb says OFF, inverted) and stays optimistic; the echo
 *     setHintsOff('True') → OFF; a tap back sends ixian:hintsoff:0;
 *   · nothing lands in localStorage (C# owns the value: SHints).
 * Deliberate breaks: see the S11 A2 report. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  let s = null;
  const open = async (caps) => {
    s = await K.boot('settings.html', { wait: 1500 });
    s.push('setCaps', caps);
    s.push('setHintsOff', 'False');
    await K.sleep(200);
    const hub = s.d.querySelector('[data-setting-key="notifications"]');   // ★ S18 D1 re-base: was chatappearance
    if (hub) hub.click();
    await K.sleep(300);
    return s;
  };
  /* ★ S18 D1 RE-BASE: the switch's section on the Notifications screen (was: the fifth Chat appearance card, S17 C) */
  const sw = (d) => [...d.querySelectorAll('.c-settings-notifs .c-settings__section')].find((x) => /Tips on the Chats screen/.test(x.textContent));
  const r = {};
  try {
    await open('settingsApply,downloadsInline,globalNotifications');
    r.noCapNoSwitch = !!s.d.querySelector('.c-settings-notifs') && !sw(s.d);
    s.close(); s = null;
    await open('settingsApply,downloadsInline,globalNotifications,hints');
    const { d, W } = s;
    const lsBefore = W.localStorage.length;
    const hs = sw(d);
    /* ★ S18 D1 RE-BASE (was "right under Message preview" in Chat appearance card 5): on Notifications, in its OWN card */
    r.onNotifications = !!hs && hs.dataset.pref === 'hintsOn' && !!hs.closest('.c-settings-notifs__tips') && !d.querySelector('.c-settings-appearance');
    const t = hs && hs.querySelector('[role="switch"]');
    r.seedOn = !!t && t.getAttribute('aria-checked') === 'true';
    s.sent.length = 0;
    t.click();
    await K.sleep(40);
    r.tapSendsOff = JSON.stringify(s.sent) === '["ixian:hintsoff:1"]' && t.getAttribute('aria-checked') === 'false';
    s.push('setHintsOff', 'True');
    await K.sleep(120);
    const t2 = sw(d).querySelector('[role="switch"]');
    r.echoOff = t2.getAttribute('aria-checked') === 'false';
    s.sent.length = 0;
    t2.click();
    await K.sleep(40);
    r.tapBackSendsOn = JSON.stringify(s.sent) === '["ixian:hintsoff:0"]';
    r.noStorage = W.localStorage.length === lsBefore;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A2 (#1263, R3-MINOR-1): the settings shell\'s hints switch — none without the hints cap; with it "Tips on the Chats screen" sits on the Notifications screen (★ S18 D1 re-base: was under Message preview in Chat appearance); setHintsOff("False") → ON; a tap → ixian:hintsoff:1 (optimistic OFF); the echo setHintsOff("True") → OFF; a tap back → ixian:hintsoff:0; no localStorage — ' + JSON.stringify(r));
}
