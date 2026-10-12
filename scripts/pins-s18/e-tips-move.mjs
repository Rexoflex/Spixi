/* ==== S18 D1 (S17 walk + #1362 interview, Damir 2026-10-12 17:2x: "hard to catch" — the Tips switch moves to Notifications) ====
 * On the BUILT settings.html (jsdom), on the PHONE path (a phone UA) and the DESKTOP PANE (?desktop=1 + setPaneMode 1), the
 * real rows:
 *   · Account › Notifications carries "Tips on the Chats screen" (key hintsSwitch) in its OWN card AFTER the notification
 *     card(s) (the OneSignal footnote stays under its card), data-pref="hintsOn", seeded from setHintsOff (C# SHints);
 *   · Chat appearance has NO Tips switch any more — its list card holds the message-preview control alone;
 *   · the verb is unchanged: a tap → ixian:hintsoff:1 (the verb says OFF), a tap back → ixian:hintsoff:0;
 *   · an unsolicited setHintsOff push moves the switch IN PLACE (the screen node is kept — the host's data-pref echo);
 *   · no `hints` cap (an older exe) → no switch.
 * Deliberate breaks (S18 report): the data-pref dropped from the row → the presence + echo clauses fail; the settings.html
 * wiring (onHints) dropped from the Notifications build → the presence clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const PHONE = (t) => t.split('var u=navigator.userAgent;').join("var u='Mozilla/5.0 (Linux; Android 14) Mobile';");
  const all = {};
  for (const pane of [false, true]) {
    const r = {};
    let s = null;
    const boot = async (caps) => {
      s = await K.boot('settings.html', { wait: 900, desktop: pane, html: pane ? null : PHONE });
      s.push('setCaps', caps);
      if (pane) s.push('setPaneMode', '1');
      s.push('setHintsOff', 'False');
      await sleep(250);
      return s;
    };
    const row = (key) => s.d.querySelector('[data-setting-key="' + key + '"]');
    const tips = () => [...s.d.querySelectorAll('.c-settings__section')].find((x) => /Tips on the Chats screen/.test(x.textContent || ''));
    try {
      await boot('settingsApply,globalNotifications');
      row('notifications').click(); await sleep(400);
      r.noCap = !!s.d.querySelector('.c-settings-notifs') && !tips();
      s.close(); s = null;
      await boot('settingsApply,globalNotifications,callRingtone,hints');
      r.flag = s.d.documentElement.hasAttribute('data-desktop') === pane;
      /* Chat appearance: no switch */
      row('chatappearance').click(); await sleep(500);
      const list = s.d.querySelector('.c-settings-appearance__card--list');
      r.notInChatAppearance = !!s.d.querySelector('.c-settings-appearance') && !tips() && !s.d.querySelector('.c-settings-appearance [data-pref="hintsOn"]')
        && !!list && !!list.querySelector('.c-settings-appearance__preview-lines') && !list.querySelector('.c-settings__switch');
      if (!pane) { const b = s.d.querySelector('.c-settings-appearance .c-topbar button[aria-label="Back"]'); if (b) b.click(); await sleep(700); }
      /* Notifications: the switch, its own card, after the notification card */
      row('notifications').click(); await sleep(400);
      const scr = s.d.querySelector('.c-settings-notifs');
      const sec = tips();
      const groups = scr ? [...scr.querySelectorAll('.c-settings__group')] : [];
      r.present = !!scr && !!sec && scr.contains(sec) && sec.dataset.pref === 'hintsOn' && !!sec.closest('.c-settings-notifs__tips')
        && groups.length >= 2 && groups[groups.length - 1].contains(sec) && groups[groups.length - 1].children.length === 1
        && !groups[0].contains(sec);
      const sw = () => tips() && tips().querySelector('[role="switch"]');
      r.seedOn = !!sw() && sw().getAttribute('aria-checked') === 'true';
      s.sent.length = 0;
      sw().click(); await sleep(40);
      r.tapOff = JSON.stringify(s.sent) === '["ixian:hintsoff:1"]' && sw().getAttribute('aria-checked') === 'false';
      s.push('setHintsOff', 'True'); await sleep(150);   // the echo resolves the latch
      /* an unsolicited push (no tap in flight) moves it IN PLACE — the same screen node */
      const node = s.d.querySelector('.c-settings-notifs');
      const sw0 = sw();
      s.push('setHintsOff', 'False'); await sleep(150);
      r.echoInPlace = s.d.querySelector('.c-settings-notifs') === node && sw() === sw0 && sw().getAttribute('aria-checked') === 'true';
      s.sent.length = 0;
      sw().click(); await sleep(40);
      r.verbSame = JSON.stringify(s.sent) === '["ixian:hintsoff:1"]';
      r.noErr = K.noErr(s.errs);
    } catch (e) { r.threw = e.message; }
    finally { if (s) s.close(); }
    all[pane ? 'pane' : 'phone'] = r;
  }
  ok(Object.values(all).every((r) => Object.values(r).every((v) => v === true)),
    '★ S18 D1 (#1362 interview): the Tips switch lives on Notifications (its own card after the notification card, data-pref hintsOn) on the phone AND in the desktop pane, not in Chat appearance; the verb is unchanged (ixian:hintsoff:<1|0>), an unsolicited setHintsOff moves it in place, no hints cap → no switch — ' + JSON.stringify(all));
}
