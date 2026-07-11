/**
 * call-ui — shared shell glue for the LIVE call bridge (Batch A: the redesigned
 * app had NO call UI at all — the shells never defined the C# push globals, so
 * every call push died on an undefined identifier).
 *
 * Bridge contract (verified, SpixiContentPage.cs — the pushes live on the BASE
 * class so every page/WebView can receive them):
 *   C#→JS  addCallAppRequest(address, sessionIdHex, text)   — ringing (:1387)
 *          addAppRequest(sessionIdHex, text, ok, cancel)    — 4-arg MINI-APP
 *            session request (:1368) — a NO-OP handler here (legacy parity: the
 *            spixi.js:247 body is a commented-out TODO). It must EXIST though:
 *            C# pushes it whenever an unaccepted mini-app session is around, and
 *            an undefined page global throws a ReferenceError while evaluating
 *            the ARGUMENT to executeUiCommand — i.e. before native.js's try/catch
 *            can soften it (audit #257). chat.html/home.html declare their OWN
 *            13-arg app-invite handler AFTER the ...callUi spread (arg-count
 *            guarded), so theirs still wins — this key is a plain property.
 *          clearAppRequests()                               — precedes every
 *            displayAppRequests pass (:1355); the ONLY signal that removes a
 *            ringing card (caller hang-up sends no dedicated clear).
 *          displayCallBar(sessionIdHex, text, startedSecs)  — active call
 *            (:1333); text is C#-localized + pre-composed; startedSecs is unix
 *            SECONDS, "0" while dialing → no timer (legacy spixi.js:304).
 *          hideCallBar()                                    — call ended (:1345).
 *   JS→C#  ixian:appAccept:<addr>:<sessionId> · ixian:appReject:<addr>:<sessionId>
 *          · ixian:hangUp:<sessionId> — all on onNavigatingGlobal (:1449-1462),
 *          so they work from ANY page. Accept routes through C# (VoIPManager
 *          .acceptCall) — the WebView only ever emits intent (SECURITY.md).
 *
 * DELIVERY REALITY (verified — sharper than the docs): UIHelpers
 * .refreshAppRequests is a GLOBAL one-shot flag consumed by the FIRST ticked
 * page; HomePage.OnUpdateUI ticks NavigationStack.Last() (= HomePage under the
 * #225 overlay nav) BEFORE the top overlay → mid-session call events land in
 * home.html's WebView only. Overlay pages get the CURRENT state once at present
 * time (SpixiContentPage.cs:1084-1090). A broadcast fix is a BE ask (be-cutover
 * C19) — this glue is wired into every shell now, ready for it.
 *
 * attachCallUi({ bridge, host, resolveCaller, onReturn, strings }) → handlers
 *   Spread the returned map into the shell's bridge.exposeAll(handlers) object.
 *   resolveCaller(address) → { name, avatar } | null — shell-local identity
 *     lookup (chats list / roster); falls back to the truncated address + the
 *     C# pre-composed text line.
 *   onReturn(friendAddress) — wired ONLY when C# starts appending the friend
 *     address to displayCallBar (BE arg-append ask C19; additive last arg per
 *     be-cutover rules). Absent today → the bar shows text + timer + hang-up.
 */
import { getStrings } from './strings-runtime.js';
import { showIncomingCall, hideIncomingCall } from './call-overlay.js';
import { showCallBar, hideCallBar } from './callbar.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';

/* clearAppRequests → re-add grace: C#'s displayAppRequests pass is
 * clear-then-re-add across SEPARATE EvaluateJavaScriptAsync calls (frames
 * apart) — dropping the card on the clear and re-creating it on the re-add
 * would flash the overlay on every pass. The clear defers the drop; a same-
 * session re-add inside the window cancels it. A REAL clear (caller hung up
 * while ringing — no re-add follows) lands within the window. */
const CLEAR_GRACE_MS = 400;

export function attachCallUi({
  bridge,
  host = document.body,
  resolveCaller,
  onReturn,
  strings = getStrings(),
} = {}) {
  const call = {
    ringEl: null,      // live incoming-call overlay (singleton per shell)
    ringSession: '',   // sessionIdHex of the live ring
    ringNamed: false,  // the ring shows a RESOLVED name (not the fallback address)
    clearTimer: 0,     // pending deferred drop (see CLEAR_GRACE_MS)
    doneSession: '',   // sessionIdHex the user already answered here (see below)
    barSession: '',    // sessionIdHex of the active call (hang-up target)
    friendAddr: '',    // C19 arg-append: the call peer (return-to-call target)
  };

  function ringLabel(name) {
    const base = strings.incomingCall || 'Incoming voice call';
    return name ? base + ' — ' + name : base;
  }

  function dropRing() {
    clearTimeout(call.clearTimer);
    call.clearTimer = 0;
    if (!call.ringEl) return;
    const el = call.ringEl;
    call.ringEl = null;
    call.ringSession = '';
    call.ringNamed = false;
    hideIncomingCall(el);   // SILENT dismiss — never reports an ignore outcome
  }

  /* the user answered THIS ring on THIS surface: latch the session so a
   * displayAppRequests pass still in flight (C# hasn't handled our async
   * location.href yet) cannot RESURRECT the card the user just answered.
   * Single value — a session id is unique per call, so there is nothing to
   * accumulate. Released in clearAppRequests once C# stops re-listing it. */
  function markAnswered(sid) {
    call.doneSession = sid;
    call.ringEl = null;
    call.ringSession = '';
    call.ringNamed = false;
  }

  /* same-session re-push: the ring can BEAT the roster (cold boot — the call
   * push lands before clearChats/addChat), so the first paint may be stuck on
   * the truncated address for the whole ring. Re-resolve and patch the identity
   * IN PLACE — never re-create the overlay (that would restart the entry
   * animation and steal focus off the autofocused Accept button).
   * call-overlay.js exposes no update API; these are its rendered nodes
   * (call-overlay.js:43-55) — all reads guarded, all writes idempotent. */
  function refreshRingCaller(addr, text) {
    if (!call.ringEl || call.ringNamed) return;   // already showing a real name
    const known = (resolveCaller && resolveCaller(addr)) || null;
    const name = (known && known.name) || '';
    if (!name) return;                            // still unresolved — keep the fallback
    call.ringNamed = true;
    const el = call.ringEl;
    const nameEl = el.querySelector('.c-callin__name');
    if (nameEl) nameEl.textContent = name;
    // the C# pre-composed line only carried the name; with a resolved identity
    // the sub falls back to the generic label (mirrors the first-paint rule)
    const subEl = el.querySelector('.c-callin__sub');
    if (subEl) subEl.textContent = strings.incomingCall || 'Incoming voice call';
    const avatarWrap = el.querySelector('.c-callin__avatar');   // pulse ring lives here
    if (avatarWrap) {
      avatarWrap.replaceChildren(createAvatar({
        src: (known && known.avatar) || null, name, address: addr, size: 48,
      }));
    }
    el.setAttribute('aria-label', ringLabel(name));
    void text;   // superseded by the resolved name
  }

  return {
    /* ringing — 3-arg push (SpixiContentPage.cs:1387). Re-pushed on every
     * displayAppRequests pass; the same session keeps the live overlay. */
    addCallAppRequest(address, sessionId, text) {
      const addr = String(address || '');
      const sid = String(sessionId || '');
      clearTimeout(call.clearTimer);            // a re-add cancels a pending clear
      call.clearTimer = 0;
      // already answered here → C# just hasn't caught up with our intent yet
      if (sid && sid === call.doneSession) return;
      call.doneSession = '';                    // a genuinely new session → release
      if (call.ringEl && call.ringSession === sid) {   // same ring — keep it
        refreshRingCaller(addr, text);                 // …but let a late roster land
        return;
      }
      dropRing();                               // different session → replace
      const known = (resolveCaller && resolveCaller(addr)) || null;
      const name = (known && known.name) || '';
      call.ringSession = sid;
      call.ringNamed = !!name;
      call.ringEl = showIncomingCall({
        host,
        ignore: false,   // Damir (Batch A interview): Accept/Decline only — no
                         // local-dismiss verb exists (C# would keep ringing)
        caller: {
          name: name || (addr ? truncateAddressMiddle(addr) : ''),
          address: addr,
          avatar: (known && known.avatar) || null,
        },
        // no shell-local identity → the C# pre-composed localized line
        // ("Incoming call - Nick") carries the caller name instead
        sub: name ? '' : String(text || ''),
        onAccept: () => {
          markAnswered(sid);   // the overlay latches + dismisses itself
          bridge.send('ixian:appAccept:' + addr + ':' + sid);
        },
        onDecline: () => {
          markAnswered(sid);
          bridge.send('ixian:appReject:' + addr + ':' + sid);
        },
        strings,
      });
    },

    /* 4-arg MINI-APP session request (SpixiContentPage.cs:1368) — deliberate
     * no-op (see docblock): the global must merely EXIST so the push doesn't
     * throw. Plain property, so a shell key declared after the ...callUi spread
     * (chat.html / home.html app invites) still overrides it. */
    addAppRequest() {},

    /* the only removal signal for a ringing card (see CLEAR_GRACE_MS). Never
     * touches the callbar — that has its own hideCallBar verb. Also releases the
     * answered-session latch: a re-add inside the grace window cancels this
     * timer (so the latch survives while C# still re-lists the session); once
     * C# stops re-listing it, the latch clears and a future ring is unblocked. */
    clearAppRequests() {
      if (!call.ringEl && !call.doneSession) return;
      const sid = call.ringSession;
      const done = call.doneSession;
      clearTimeout(call.clearTimer);
      call.clearTimer = setTimeout(() => {
        call.clearTimer = 0;
        if (call.doneSession === done) call.doneSession = '';
        if (call.ringEl && call.ringSession === sid) dropRing();
      }, CLEAR_GRACE_MS);
    },

    /* active call strip. startedSecs = unix SECONDS; "0" while dialing → no
     * timer (legacy spixi.js:304). The component is a singleton per host and
     * mutates in place on re-pushes (dialing → in-call flips the timer on).
     * Hang-up hides the LOCAL bar optimistically (Damir F5: C#'s answering
     * hideCallBar targets the stack-last page — home — so a bar shown in any
     * OTHER WebView never hears the end and ticks forever). Local knowledge is
     * enough: THIS surface asked to end the call. If the hang-up somehow fails,
     * the next displayCallBar push re-creates the singleton. Remote hang-up
     * staleness on non-home surfaces remains the C18 broadcast ask. */
    displayCallBar(sessionId, text, startedSecs, friendAddress) {
      const sid = String(sessionId || '');
      /* an ACTIVE call means no ring can still be valid — drop ours immediately
       * (idempotent; also cancels a pending clear-grace drop), and latch the
       * session so a refresh pass can't re-add the ring underneath the bar.
       * Closes: (a) a re-list on THIS surface after the answer, and (b) any page
       * PRESENTED during a live call — its present-time pass (SpixiContentPage
       * .cs:1084-1090) hands it both the ring state and the bar, and the bar's
       * dropRing() wins. NOT closed (BE C18): a surface that already rendered the
       * ring and never receives displayCallBar (C# pushes it to stack-last only,
       * and sends no clearAppRequests on accept) keeps a stale card whose Decline
       * would fire ixian:appReject on the now-live session — VoIPManager.rejectCall
       * has no accepted-guard, so it would KILL the call. C18 = broadcast + a
       * rejectCall accepted-guard. */
      dropRing();
      if (sid) call.doneSession = sid;
      call.barSession = sid;
      call.friendAddr = String(friendAddress || '');   // C19 — empty today
      const t = Number(startedSecs) || 0;
      showCallBar({
        host,
        text: String(text || ''),
        startedAt: t > 0 ? t * 1000 : null,
        onHangUp: () => {
          const target = call.barSession;
          if (!target) return;              // already ended — idempotent
          call.barSession = '';             // no dead id left in the closure
          call.friendAddr = '';
          bridge.send('ixian:hangUp:' + target);
          hideCallBar(host);   // optimistic local echo (see docblock)
        },
        /* gate on the RUNTIME address, not on the host merely having a handler:
         * home passes onReturn unconditionally, but C# pushes only 3 args today
         * (SpixiContentPage.cs:1333) → friendAddr === '' → a wired-but-dead
         * "Return to call" button on the one surface that actually shows the bar.
         * Undefined here ⇒ callbar renders the inert variant. Lights up for free
         * when C19 appends the address (additive arg on the FIRST push of a call —
         * the callbar singleton re-push does not upgrade inert → button). */
        onReturn: (onReturn && call.friendAddr)
          ? () => onReturn(call.friendAddr)
          : undefined,
        strings,
      });
    },

    /* call ended. Reset the hang-up target too — a dead session id lingering in
     * the closure would otherwise be the target of a stray hang-up. */
    hideCallBar() {
      call.barSession = '';
      call.friendAddr = '';
      hideCallBar(host);
    },
  };
}
