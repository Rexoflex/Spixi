/* ★ S11 C (#1262) — the PURE half of the 10-FLASH probe build (the hold's release decision + the dev switches + the
 * [P1] probe lines) and of the photo auto-download (the decision + the setting's grammar) (scripts/csh: S11ChatTests.cs).
 * No MAUI, no Core type, no disk — the harness executes every rule. The call sites (SpixiContentPage's hold, DevPage's
 * `ixian:devflash:` verb, SettingsPage's `ixian:photoAutoDl:` verb, SingleChatPage's offer path) are pinned by
 * scripts/pins-s11/c-wiring.mjs.
 *
 * SECURITY (CLAUDE.md ★): both verbs carry only fixed words / one digit, validated HERE before C# stores anything; the
 * auto-download decision never sees a WebView value (the offer's size + name come from Core's stored file header).
 * ★ S11 C2 (#1263, the #46 r1 fixes): the stale-answer rule (ackStep / isStaleAck), the deferred-action owner check
 * (deferredOwns), the contact rule (contactOkForAuto — bot rooms never), the network rule (unmeteredProfiles) and the
 * flood guard (autoBudgetOk + S11AutoLedger: 4 in flight, 50 MB per chat per 24 h; ★ S11 G3 #1263 MINOR-6: an offer refused by
 * the in-flight cap ALONE waits in a bounded per-chat pending queue — offer / takeReady) — all executed in S11ChatTests. */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    public static class S11ChatRules
    {
        // —— 10-FLASH: the hold's release (Android, the pre-warmed spare chat) ——

        /** The release reasons (fixed words — they ride the `[CDPERF] chat held … why=` line). `vsc` = the old path's
         *  visual-state callback + one frame; `paint` = the candidate: the shell's paint answer + one frame. */
        public const string WhyVsc = "vsc";
        public const string WhyPaint = "paint";
        public const string WhyCap = "cap";

        /** Frames that must pass AFTER the shell's paint answer arrived before the candidate releases (the contract's
         *  "and one more frame"). */
        public const int AckFrames = 1;

        /** ★ S11 C2 (#1263, #46 r1 R1-m1 — a STALE answer): the hold pushes `paintAck` at frame 0, and the genuine answer
         *  needs two shell rAFs + the bridge trip, so it cannot come before Choreographer frame 2. Any `ixian:painted` that
         *  arrives earlier is another one (an `onChatScreenLoaded` painted queued behind the present, a re-flush) and is
         *  NOT the answer: ignored (counted as stale on the release line); the real answer still releases. */
        public const int AckMinFrames = 2;

        /** One `ixian:painted` heard by the hold at Choreographer frame `frames`: the new ackAt (-1 = still no answer).
         *  A hold that ended, or already has its answer, keeps what it has; an answer before AckMinFrames is stale. */
        public static int ackStep(bool ended, int ackAt, int frames)
        {
            if (ended || ackAt >= 0)
            {
                return ackAt;
            }
            return frames >= AckMinFrames ? frames : -1;
        }

        /** True when this `ixian:painted` is a stale one the hold ignores (ackStep returned -1 for a live, unanswered hold). */
        public static bool isStaleAck(bool ended, int ackAt, int frames)
        {
            return !ended && ackAt < 0 && frames < AckMinFrames;
        }

        /** ★ S11 C2 (#1263, R1-m5): a dev-switch action deferred FlashDeferMs by a release still belongs to that hold only
         *  if no newer hold of the same stage started since (a re-present of a parked chat inside the 400 ms) — the op's
         *  hold counter at the release vs now. */
        public static bool deferredOwns(int holdSeqAtRelease, int holdSeqNow)
        {
            return holdSeqAtRelease == holdSeqNow;
        }

        /** One step of the hold: "" = keep holding, else the release reason. The cap always wins (never a stuck,
         *  input-dead chat). OLD path (candidate off): the visual-state callback seen → `vsc` (PresentHold ends on the
         *  frame after it). CANDIDATE: the shell's `ixian:painted` answer to the hold's `paintAck` push seen, and
         *  AckFrames frames counted after it → `paint`; the visual-state callback alone no longer releases. */
        public static string holdStep(bool candidate, bool vscSeen, bool ackSeen, int framesSinceAck, long elapsedMs, int capMs)
        {
            if (elapsedMs >= capMs)
            {
                return WhyCap;
            }
            if (!candidate)
            {
                return vscSeen ? WhyVsc : "";
            }
            return ackSeen && framesSinceAck >= AckFrames ? WhyPaint : "";
        }

        /* ★ S12 E (#1266 / #1267, V-26) — THE GROUNDS WAIT FOR THE WEBVIEW'S DRAW. Walk #1266 measured the S11 candidate:
         * every held open released on the shell's paint answer (why=paint ackf=2), yet the recording showed ONE flat frame of
         * the page ground (#f9f9fb) between the list and the chat, lined up with the release to ±20 ms on 15 opens. The probe
         * read: the native chat WebView was NOT dirty on any held frame and became dirty two frames AFTER the release — the
         * shell had painted inside Chromium, but the Android view had not drawn that frame into the window, so the opaque
         * grounds the release wrote showed alone for a frame. The fix: at the release the grounds stay transparent (the list
         * still shows through) and come back only after the WebView's visual-state callback (the content is ready; C# then
         * invalidates the view), a view-tree draw counted after it (OnDrawListener) and GroundAfterDrawFrames more frame(s);
         * GroundCapMs is the backstop (never a hole). #46 r1 / r2 replaced an IsDirty reading that could not see the draw. */
        public const string GroundWhyDrawn = "drawn";
        public const string GroundWhyCap = "cap";

        /** Frame callbacks after the first view-tree draw counted after `ready` before the grounds come back: the frame the draw happened in has
         *  to reach the glass before an opaque ground can sit under it. */
        public const int GroundAfterDrawFrames = 1;

        /** The longest the grounds stay transparent after the release (the S11 FlashDeferMs was 400; a held open releases
         *  at ~115–207 ms, so release + 300 ms stays under the old 250 + 400 worst case). */
        public const int GroundCapMs = 300;

        /** One Choreographer step of the grounds wait: "" = keep waiting, else why the grounds come back now. ★ #46 r1
         *  (R1-MAJOR-2) + r2 (m-2): `ready` = the WebView's visual-state callback has completed (Chromium has the current
         *  state for the next draw); `drawsAfterReady` = view-tree draws counted after it (OnDrawListener — the draw that
         *  carries the content); `framesAfterDraw` = frame callbacks since the first such draw. The cap always wins. */
        public static string groundStep(bool ready, int drawsAfterReady, int framesAfterDraw, long elapsedMs, int capMs)
        {
            if (elapsedMs >= capMs)
            {
                return GroundWhyCap;
            }
            return ready && drawsAfterReady > 0 && framesAfterDraw >= GroundAfterDrawFrames ? GroundWhyDrawn : "";
        }

        /** [P1] probe body: the grounds came back — why, the frames the wait counted, the ms since the release, and
         *  whether the visual-state callback had come (rdy=1|0; a cap with rdy=0 = the WebView never confirmed). */
        public static string groundLine(string why, int frames, long ms, bool ready)
        {
            string w = why == GroundWhyDrawn || why == GroundWhyCap || why == "noview" ? why : "other";
            return "hold grounds why=" + w + " f=" + clampInt(frames) + " ms=" + clampLong(ms) + " rdy=" + (ready ? "1" : "0");
        }

        /* The Developer-screen switches (DevPage, `ixian:devflash:<name>:<0|1>`), one int preference of bits.
         * DEFAULT 0 = the candidate ON and every release action at the release. They act only while dev mode is on. */
        public const int FlashCandidateOff = 1;   // the old release path (PresentHold: vsc + one frame)
        public const int FlashSkipGrounds = 2;    // the release does NOT paint the grounds back (they follow FlashDeferMs later)
        public const int FlashSkipInput = 4;      // the release does NOT flip stage.InputTransparent (it follows FlashDeferMs later)
        public const int FlashAll = FlashCandidateOff | FlashSkipGrounds | FlashSkipInput;

        /** The Preferences key of the switch bits (an int; absent = 0). Cleared by the wipe (Preferences.Default.Clear). */
        public const string FlashPrefKey = "devFlashBits";

        /** A skipped release action is not dropped (no hole, no input-dead chat): it runs this much later, outside the
         *  frames the recording looks at (4 flat + 1 grey ≈ 85 ms). */
        public const int FlashDeferMs = 400;

        /** The switch name of the verb → its bit; 0 = not a switch (the verb is then ignored). */
        public static int flashBit(string? name)
        {
            switch (name)
            {
                case "candidate": return FlashCandidateOff;
                case "grounds": return FlashSkipGrounds;
                case "input": return FlashSkipInput;
                default: return 0;
            }
        }

        /** Parse `<name>:<0|1>` (the verb's tail): true + the new bits when exact; false (bits unchanged) otherwise. */
        public static bool applyFlashVerb(string? tail, int bits, out int next)
        {
            next = bits & FlashAll;
            if (tail == null)
            {
                return false;
            }
            int colon = tail.IndexOf(':');
            if (colon <= 0 || colon != tail.Length - 2)
            {
                return false;
            }
            int bit = flashBit(tail.Substring(0, colon));
            char v = tail[colon + 1];
            if (bit == 0 || (v != '0' && v != '1'))
            {
                return false;
            }
            next = v == '1' ? (next | bit) : (next & ~bit);
            return true;
        }

        /** The bits that ACT: none unless dev mode is on (a user who left dev mode keeps the shipped behaviour). */
        public static int effectiveFlashBits(bool devMode, int stored)
        {
            return devMode ? (stored & FlashAll) : 0;
        }

        public static bool flashOn(int bits, int bit)
        {
            return (bits & bit) != 0;
        }

        /** The dev screen's push: "<candidate on 0|1>,<grounds at release 0|1>,<input at release 0|1>" — the switch
         *  positions as the user reads them (1 = ON). */
        public static string flashSwitchesArg(int bits)
        {
            return (flashOn(bits, FlashCandidateOff) ? "0" : "1") + ","
                + (flashOn(bits, FlashSkipGrounds) ? "0" : "1") + ","
                + (flashOn(bits, FlashSkipInput) ? "0" : "1");
        }

        // —— ★ S14 (#1282): the Developer "Overlay container" switch (Android) — its own int preference, the flash bits untouched ——

        /** What gives an Android overlay stage its permanent WrapperView. CLIP (default) = a huge RectangleGeometry clip (no
         *  shadow → no software shadow draw); SHADOW = the 13c zero shadow (a SOLID shadow paint → PlatformWrapperView draws
         *  the subtree into an ALPHA_8 bitmap on every invalidate; UpdateOpacity invalidates on every fade step); NONE = no
         *  container and the stage's input is never flipped (non-held overlays only — a held chat keeps the clip). */
        public const int ContainerClip = 0;
        public const int ContainerShadow = 1;
        public const int ContainerNone = 2;

        /** The Preferences key of the mode (an int; absent = 0 = clip). Cleared by the wipe (Preferences.Default.Clear). */
        public const string ContainerPrefKey = "devOverlayContainer";

        /** `ixian:devflash:container:<clip|shadow|none>` — the tail after the last ':' must be one of the three words exactly. */
        public static bool parseContainerVerb(string? tail, out int mode)
        {
            mode = ContainerClip;
            switch (tail)
            {
                case "clip": mode = ContainerClip; return true;
                case "shadow": mode = ContainerShadow; return true;
                case "none": mode = ContainerNone; return true;
                default: return false;
            }
        }

        /** The mode that ACTS: clip unless dev mode is on and a known non-default mode is stored. */
        public static int effectiveContainer(bool devMode, int stored)
        {
            return devMode && (stored == ContainerShadow || stored == ContainerNone) ? stored : ContainerClip;
        }

        /** The fixed word of a stored mode (the dev screen's push and the [P1] line); anything unknown reads clip. */
        public static string containerWord(int mode)
        {
            return mode == ContainerShadow ? "shadow" : mode == ContainerNone ? "none" : "clip";
        }

        /** The container one stage gets: NONE only for a stage that needs no input flip (a held chat — and a parking stage,
         *  hidden input-dead at Opacity 0 — keep the clip, the hold needs an input-dead permanent container). */
        /** #46 fix r1 (R1 MINOR-1/-2): what needs the input flip (so never None): a held / parking stage, any stage that does
         *  NOT slide in (None probes only the slide-in present), and nothing else. A None-mode chat info is refused as a
         *  rider instead (SpixiContentPage.rideNextChatSwap) — it keeps probing the chat-info slide. */
        public static bool stageNeedsInputFlip(bool held, bool parks, bool slidesIn)
        {
            return held || parks || !slidesIn;
        }

        public static int containerFor(int mode, bool needsInputFlip)
        {
            if (mode == ContainerShadow)
            {
                return ContainerShadow;
            }
            return mode == ContainerNone && !needsInputFlip ? ContainerNone : ContainerClip;
        }

        /** The clip rectangle's half side in DIPs: RectangleGeometry.AppendPath ignores the bounds Clip.PathForBounds is given,
         *  so the path is this fixed rect (× density on Android) — far beyond any screen, any slide translation included. */
        public const double ContainerClipHalf = 100000;

        // —— ★ S14 (#1283): chat info rides the chat → group swap (SpixiContentPage.rideAlong) — the two decisions ——

        /** A staging chat push owns the armed ride only when it is the held chat → chat swap of the full-screen layout
         *  (`qualifies`), nothing owns it yet, and it carries the armed navigation key (an ordinal, non-null match). */
        public static bool rideOwns(bool qualifies, bool ownerSet, string? pushNavKey, string? armedNavKey)
        {
            return qualifies && !ownerSet && pushNavKey != null && armedNavKey != null
                && string.Equals(pushNavKey, armedNavKey, StringComparison.Ordinal);
        }

        /** The rider's end when the swap settles: restore (input-live, on top) only when the new chat is CLOSING (the user backed
         *  out during the hold), the rider is still open, and the topmost open chat sits BELOW it in the overlay stack (it covers
         *  the chat it describes again). Every other case closes it. Indexes are overlay-stack positions, -1 = none. */
        public static bool riderRestores(bool heldClosing, bool riderOpen, int riderIndex, int topChatIndex)
        {
            return heldClosing && riderOpen && riderIndex >= 0 && topChatIndex >= 0 && topChatIndex < riderIndex;
        }

        /** #46 fix r1 (R3 MAJOR-1): the rider's end as an EFFECTS list (bits) — settleRider applies every bit it gets, in this
         *  order: clear swappedOut · stage input-live · clear the hook · close (instant). Restore = the first two (it covers the
         *  chat it describes again, tappable); close = hook cleared + closed; a rider already closing / gone = hook cleared only. */
        public const int RiderFxClearSwapped = 1;
        public const int RiderFxInputLive = 2;
        public const int RiderFxClearHook = 4;
        public const int RiderFxClose = 8;

        public static int riderEffects(bool heldClosing, bool riderOpen, int riderIndex, int topChatIndex)
        {
            if (riderRestores(heldClosing, riderOpen, riderIndex, topChatIndex))
            {
                return RiderFxClearSwapped | RiderFxInputLive;
            }
            return riderOpen ? RiderFxClearHook | RiderFxClose : RiderFxClearHook;
        }

        public static bool fxHas(int fx, int bit)
        {
            return (fx & bit) != 0;
        }

        /** #46 fix r1 (R1 MINOR-4): the ride's timers. The short timeout drops only an UNOWNED ride (onChat never staged a
         *  push); once a staging push owns it, the owner's outcomes end it (present → takeRide, cancel / fallback →
         *  rideCancelled) and only the long backstop — past the chat push's own 4 s load timeout — may still drop it. */
        public static bool rideTimeoutDrops(bool owned, bool backstop)
        {
            return backstop || !owned;
        }

        /** [P1] probe body (P1Perf grammar: ≤ 16 tokens of [a-z0-9_.=-]{1,40}): one frame of the hold window.
         *  rel = 0 while held, 1 after the release · od = the window's onDraw passes since the hold began ·
         *  dirty = the native WebView's isDirty() at this frame. */
        public static string holdFrameLine(int frame, long ms, bool released, int draws, bool dirty)
        {
            return "hold frame f=" + clampInt(frame) + " ms=" + clampLong(ms) + " rel=" + (released ? "1" : "0")
                + " od=" + clampInt(draws) + " dirty=" + (dirty ? "1" : "0");
        }

        /** [P1] probe body: the release tick (both paths) — why, the frames counted, the ms, the candidate's state. */
        public static string holdReleaseLine(string why, int frames, long ms, bool candidate, bool vscSeen, int ackAt, int staleAcks, int skipBits)
        {
            string w = why == WhyVsc || why == WhyPaint || why == WhyCap || why == "noview" || why == "novsc" ? why : "other";
            return "hold release why=" + w + " frames=" + clampInt(frames) + " ms=" + clampLong(ms)
                + " cand=" + (candidate ? "1" : "0") + " vsc=" + (vscSeen ? "1" : "0") + " ack=" + (ackAt >= 0 ? "1" : "0")
                + " ackf=" + (ackAt >= 0 ? clampInt(ackAt) : "none") + " stale=" + clampInt(staleAcks)   // ★ S11 C2 (#1263, R1-m1)
                + " skip=" + clampInt(skipBits & (FlashSkipGrounds | FlashSkipInput));
        }

        /** How many frames after the release the probe keeps stamping. */
        public const int ProbePostFrames = 8;

        private static string clampInt(int v)
        {
            return (v < 0 ? 0 : v).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        private static string clampLong(long v)
        {
            return (v < 0 ? 0 : (v > 99999999 ? 99999999 : v)).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        // —— Photo auto-download (Settings › Privacy) ——

        public const string AutoOff = "off";
        public const string AutoWifi = "wifi";
        public const string AutoAlways = "always";

        /** The per-photo cap of an AUTOMATIC download (a tap still takes up to PhotoRules.MaxReceiveBytes). */
        public const long AutoDownloadMaxBytes = 10L * 1024 * 1024;

        /** The verb's value → the stored word; null = not one of the three (the verb is then ignored). */
        public static string? parseAutoDownload(string? v)
        {
            switch (v)
            {
                case AutoOff: return AutoOff;
                case AutoWifi: return AutoWifi;
                case AutoAlways: return AutoAlways;
                default: return null;
            }
        }

        /** A stored value read back: anything not one of the three is OFF (the default). */
        public static string normalizeAutoDownload(string? stored)
        {
            return parseAutoDownload(stored) ?? AutoOff;
        }

        /** Parse the verb tail `<off|wifi|always>:<0|1>` (the setting + the "Load pictures and GIFs" mirror). */
        public static bool parseAutoDownloadVerb(string? tail, out string setting, out bool loadPictures)
        {
            setting = AutoOff;
            loadPictures = true;
            if (tail == null)
            {
                return false;
            }
            int colon = tail.IndexOf(':');
            if (colon <= 0 || colon != tail.Length - 2)
            {
                return false;
            }
            string? s = parseAutoDownload(tail.Substring(0, colon));
            char l = tail[colon + 1];
            if (s == null || (l != '0' && l != '1'))
            {
                return false;
            }
            setting = s;
            loadPictures = l == '1';
            return true;
        }

        /** ★ S11 C2 (#1263, #46 r1 R1-M1): the CONTACT half of the decision, pure. A ROOM is `friend.bot || type == Group`
         *  (Ixian-Core `Friend.setBotMode` sets `bot` and keeps `type == Normal`, so a type test alone missed every bot
         *  room / public channel). Never: a chat that is not approved (a pending request) or is being deleted · a BOT room
         *  (strangers post there — a tap still downloads) · a room that hides its participants · a group photo whose
         *  sender is not an approved contact. A 1:1 with an approved contact passes. */
        public static bool contactOkForAuto(bool isRoom, bool isBot, bool hidesParticipants, bool approved, bool pendingDeletion, bool senderIsApprovedContact)
        {
            if (!approved || pendingDeletion)
            {
                return false;
            }
            if (isBot)
            {
                return false;
            }
            if (isRoom)
            {
                return !hidesParticipants && senderIsApprovedContact;
            }
            return true;
        }

        /** ★ S11 C2 (#1263, R3-MAJOR-4): "Wi-Fi only" over the device's profile list (MAUI `ConnectionProfile` names:
         *  Unknown · Bluetooth · Cellular · Ethernet · WiFi). Wi-Fi or Ethernet (a desktop's link) = unmetered; null / empty
         *  / anything else = NOT (a failed read is never Wi-Fi). Exact names (ordinal). */
        public static bool unmeteredProfiles(IEnumerable<string>? profiles)
        {
            if (profiles == null)
            {
                return false;
            }
            foreach (string p in profiles)
            {
                if (p == "WiFi" || p == "Ethernet")
                {
                    return true;
                }
            }
            return false;
        }

        /* ★ S11 C2 (#1263, #46 r1 R1-m4 — nothing capped the NUMBER of automatic downloads): at most AutoMaxInFlight
         * automatic transfers run at once, and one chat gets at most AutoChatBudgetBytes of automatic downloads per
         * AutoBudgetWindowMs (declared sizes, counted when admitted). In memory (a restart forgets it — the cap is a
         * flood guard, not a quota). A transfer that has not finished AutoInFlightStaleMs after its admission stops
         * counting as in flight (an offline sender must not switch the feature off for the session); its bytes stay in
         * the chat's budget. Over a limit = no automatic download; the tap still works. */
        public const int AutoMaxInFlight = 4;
        public const long AutoChatBudgetBytes = 50L * 1024 * 1024;
        public const long AutoBudgetWindowMs = 24L * 60 * 60 * 1000;
        public const long AutoInFlightStaleMs = 10L * 60 * 1000;

        /* ★ S11 G3 (#1263 MINOR-6 — a 10-photo album left 6 offers for good): an offer refused ONLY by the in-flight cap waits
         * in a per-chat PENDING queue (at most AutoPendingPerChat per chat, AutoPendingMax in all, each at most
         * AutoPendingMaxAgeMs) and is re-admitted when a slot frees (a transfer completed, failed or went stale); a budget
         * refusal stays final. AutoPendingRecheckMs = the backstop re-check while anything waits (fails + stales leave no
         * event). */
        public const int AutoPendingPerChat = 16;
        public const int AutoPendingMax = 64;
        public const long AutoPendingMaxAgeMs = 60L * 60 * 1000;
        public const int AutoPendingRecheckMs = 15000;

        /** The limit decision: one more automatic download of `sizeBytes` fits when fewer than AutoMaxInFlight run and the
         *  chat's bytes in the window plus this one stay within the budget. */
        public static bool autoBudgetOk(int inFlight, long chatBytesInWindow, long sizeBytes)
        {
            if (inFlight >= AutoMaxInFlight)
            {
                return false;
            }
            return sizeBytes > 0 && chatBytesInWindow + sizeBytes <= AutoChatBudgetBytes;
        }

        /** THE decision. An incoming offer is downloaded without a tap only when ALL hold: the user chose Wi-Fi only
         *  (and the device is on Wi-Fi) or Always · "Load pictures and GIFs" is on · it is a photo · its size is known
         *  and ≤ 10 MB · the contact passes the manual path's checks. Default OFF → never. */
        public static bool shouldAutoDownload(string? setting, long sizeBytes, bool isPhoto, bool onWifi, bool loadPicturesOn, bool contactOk)
        {
            string s = normalizeAutoDownload(setting);
            if (s == AutoOff || !loadPicturesOn || !isPhoto || !contactOk)
            {
                return false;
            }
            if (sizeBytes <= 0 || sizeBytes > AutoDownloadMaxBytes)
            {
                return false;
            }
            return s == AutoAlways || onWifi;
        }
    }
    /** ★ S11 C2 (#1263, R1-m4): the in-memory ledger behind autoBudgetOk — one entry per ADMITTED automatic download
     *  (chat key, transfer id, declared bytes, admission time on a monotonic ms clock). Pure: the caller passes the clock
     *  and a "still running" probe (SingleChatPage: TransferManager.getIncomingTransfer(id) != null), so the harness
     *  executes it. Thread-safe (one lock); entries older than the window are dropped. */
    public enum S11AutoAdmit { Admitted, Queued, Refused }

    public sealed class S11AutoLedger
    {
        private sealed class Entry
        {
            public string chat = "";
            public string id = "";
            public long bytes;
            public long atMs;
            public object? tag = null;   // pending only: the caller's own handle (SingleChatPage: friend + row + channel)
        }

        private readonly List<Entry> entries = new List<Entry>();
        private readonly List<Entry> pending = new List<Entry>();   // ★ S11 G3 (MINOR-6): oldest first
        private readonly object gate = new object();
        private volatile int pendingCount = 0;

        /** Lock-free: anything waiting? (the per-packet hook reads it first — nothing waits = nothing else runs). */
        public bool HasPending { get { return pendingCount > 0; } }
        public int PendingCount { get { lock (gate) { return pending.Count; } } }

        /** Under `gate`: the window, the in-flight count and this chat's admitted bytes. */
        private void tally(string chatKey, long nowMs, Func<string, bool> stillRunning, out int inFlight, out long chatBytes)
        {
            entries.RemoveAll(e => nowMs - e.atMs > S11ChatRules.AutoBudgetWindowMs);
            inFlight = 0;
            chatBytes = 0;
            foreach (Entry e in entries)
            {
                if (nowMs - e.atMs <= S11ChatRules.AutoInFlightStaleMs && stillRunning(e.id))
                {
                    inFlight++;
                }
                if (e.chat == chatKey)
                {
                    chatBytes += e.bytes;
                }
            }
        }

        private long pendingBytesOf(string chatKey, string exceptId)
        {
            long b = 0;
            foreach (Entry p in pending)
            {
                if (p.chat == chatKey && p.id != exceptId)
                {
                    b += p.bytes;
                }
            }
            return b;
        }

        private void syncCount()
        {
            pendingCount = pending.Count;
        }

        /** Admit (and record) one automatic download, or refuse it (nothing recorded, nothing queued). */
        public bool tryAdmit(string chatKey, string transferId, long sizeBytes, long nowMs, Func<string, bool> stillRunning)
        {
            return offer(chatKey, transferId, sizeBytes, nowMs, stillRunning, null, false) == S11AutoAdmit.Admitted;
        }

        /** ★ S11 G3 (#1263 MINOR-6): Admitted (recorded — start it now) · Queued (refused ONLY by the in-flight cap: it waits
         *  in its chat's pending queue, bounded — `queue` false never queues) · Refused (final: the chat's budget — counting
         *  the bytes already waiting in that chat — an unknown size, or a full pending queue). The same transfer id is never
         *  queued twice. */
        public S11AutoAdmit offer(string chatKey, string transferId, long sizeBytes, long nowMs, Func<string, bool> stillRunning, object? tag, bool queue = true)
        {
            lock (gate)
            {
                tally(chatKey, nowMs, stillRunning, out int inFlight, out long chatBytes);
                if (S11ChatRules.autoBudgetOk(inFlight, chatBytes, sizeBytes))
                {
                    pending.RemoveAll(p => p.id == transferId);
                    syncCount();
                    entries.Add(new Entry { chat = chatKey, id = transferId, bytes = sizeBytes, atMs = nowMs });
                    return S11AutoAdmit.Admitted;
                }
                /* the cap ALONE refused it: would it fit with a free slot (its chat's waiting bytes counted too)? */
                if (!queue || !S11ChatRules.autoBudgetOk(0, chatBytes + pendingBytesOf(chatKey, transferId), sizeBytes))
                {
                    return S11AutoAdmit.Refused;
                }
                if (pending.Exists(p => p.id == transferId))
                {
                    return S11AutoAdmit.Queued;
                }
                int inChat = 0;
                foreach (Entry p in pending)
                {
                    if (p.chat == chatKey)
                    {
                        inChat++;
                    }
                }
                if (inChat >= S11ChatRules.AutoPendingPerChat || pending.Count >= S11ChatRules.AutoPendingMax)
                {
                    return S11AutoAdmit.Refused;
                }
                pending.Add(new Entry { chat = chatKey, id = transferId, bytes = sizeBytes, atMs = nowMs, tag = tag });
                syncCount();
                return S11AutoAdmit.Queued;
            }
        }

        /** ★ S11 G3 (#1263 MINOR-6): the OLDEST waiting offer that fits NOW (a free slot + its chat's budget), taken OFF the
         *  queue (not recorded — the caller re-decides and offers it again, which records it). On the way: one too old, or
         *  one its chat's budget no longer fits (final), is dropped. false = nothing fits now (or nothing waits). */
        public bool takeReady(long nowMs, Func<string, bool> stillRunning, out string chatKey, out string transferId, out object? tag)
        {
            lock (gate)
            {
                chatKey = "";
                transferId = "";
                tag = null;
                pending.RemoveAll(p => nowMs - p.atMs > S11ChatRules.AutoPendingMaxAgeMs);
                syncCount();
                while (pending.Count > 0)
                {
                    Entry p = pending[0];
                    tally(p.chat, nowMs, stillRunning, out int inFlight, out long chatBytes);
                    if (inFlight >= S11ChatRules.AutoMaxInFlight)
                    {
                        return false;   // no slot — every one waits (FIFO)
                    }
                    pending.RemoveAt(0);
                    syncCount();
                    if (!S11ChatRules.autoBudgetOk(inFlight, chatBytes, p.bytes))
                    {
                        continue;   // the budget refused it now — final
                    }
                    chatKey = p.chat;
                    transferId = p.id;
                    tag = p.tag;
                    return true;
                }
                return false;
            }
        }
    }
}
