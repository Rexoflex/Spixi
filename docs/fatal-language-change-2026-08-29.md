# The "Fatal exception" on a language change — 2026-08-29, Android

Damir, mid-F5 walk at row 1.7: *"got a fatal exception when I was changing the language
back to English"* — a native dialog titled **Fatal exception**, then a **blank dark screen**
until he restarted the app.

**★ NOT from the #624–#637 batch.** Nothing in this file was touched by it. The D-9 comment
in `HomePage` already records the same black-screen symptom from 2026-08-15.

## The cause, and it is one line

`Node.start()` (`Node.cs:215`) returns **`false` for two completely different things**:

```csharp
static public bool start()
{
    lock (startLock)
    {
        if (running)
        {
            Logging.warn("Cannot start Node, it is already running.");
            return false;              // ← "already running"
        }
        …
        if (!storage.prepareStorage(false))
        {
            return false;              // ← a REAL start failure
        }
```

`HomePage` treats both as fatal (`HomePage.xaml.cs:330-335`):

```csharp
if (!Node.start())
{
    Logging.error("Node.start() returned false — the node did not start.");
    await safeFatalAlert("Fatal exception", "Fatal exception has occurred, …");
    return;                            // ← connectToNetwork() never runs
}
Node.connectToNetwork();
```

★ **The dialog title is the proof.** `safeFatalAlert` is called from three places and only
this one uses the lowercase-e spelling **"Fatal exception"**; the other two are
"Fatal Exception". The window in the logcat is titled `Fatal exception`. It is this branch.

★ **And `running` in HomePage is an INSTANCE field** (`HomePage.xaml.cs:135`), so a second
`HomePage` re-enters the `if (!running)` block. `HomePage.Instance()` explicitly builds a
new one when `_singletonInstance == null || !_singletonInstance.running` (`:52-56`), and
`stop()` sets `running = false` and nulls the singleton (`:483-488`). A language change
takes exactly that path.

So: **language change → a second HomePage → `Node.start()` on an already-running node →
`false` → "Fatal exception" → `return` before `connectToNetwork()`.**

## ~~Everything else in that log is aftermath, not cause~~ — ⚠ WITHDRAWN 2026-08-27

★★ **THIS SECTION'S DIAGNOSIS IS SUPERSEDED. The text below is kept as written, because this
project marks a superseded claim and never erases it.** Read this box first.

**What was claimed.** The skipped `connectToNetwork()` left the stream session down, and that
is why the log filled with ChaCha decrypt failures and `SpixiMessage` parse errors.

**Why it is withdrawn.** Fix agent L2 checked it at source in the #46 loop, round 2:

* No site in this tree calls `connectToNetwork()` on a node that is already running.
* `App.xaml.cs:1404-1427` and `App.xaml.cs:358-381` both call `Node.connectToNetwork()` ONLY
  after a successful `Node.start()` on a node whose status was `stopped` or `stopping`.
* A HomePage rebuild does not stop the node. Nothing in this tree disconnects the stream
  session on that path.

So the skipped call is **not proven** to be the cause of the error storm. The cause of the
ChaCha and parse errors in Damir's log is **not established**. Do not use the paragraph below
as evidence for re-opening the already-running arm.

★ The parse and decrypt errors are still real, and F3 below still repairs their unguarded
dereferences. Only the CAUSAL claim is withdrawn.

---

*(original text, superseded)*

Because `connectToNetwork()` was skipped, the streaming session was not re-established, and
the log then fills with, in order:

```
Error in chacha decryption … mac check in ChaCha20Poly1305 failed
Exception occurred while trying to construct SpixiMessage from bytes:
    System.Exception: Data length is negative: -1272437690
Exception occured in StreamProcessor.receiveData:
    System.ArgumentNullException: Value cannot be null. (Parameter 'bytes')
    at System.Text.Encoding.GetString(Byte[] bytes)
    at SPIXI.StreamProcessor.receiveData(…)
```

Garbage in → the `SpixiMessage` ctor throws → `spixi_message.data` is null →
`Encoding.UTF8.GetString(null)`. All three are CAUGHT and logged; none is the fatal.

## Three separate fixes, and only the first is urgent

**F1 · the false fatal (URGENT — it blocks the money-path walk). ✅ SHIPPED, AND THE SHAPE
CHANGED. `HomePage.xaml.cs:389`.**

`HomePage` must not treat "already running" as a start failure. This is what shipped:

```csharp
if (Node.isRunning && Node.startCounter > 0)
{
    Logging.info("HomePage start block re-entered on an already-running node — not a failure.");
}
else if (!Node.start())
{
    Logging.error("Node.start() returned false — the node did not start. isRunning={0} startCounter={1}",
        Node.isRunning, Node.startCounter);
    await safeFatalAlert("Fatal exception", "…");
    return;
}
else { Node.connectToNetwork(); }
```

★★ **~~`if (Node.isRunning)`~~ WAS NOT ENOUGH.** The first draft of this row (kept above as
the withdrawn shape) tested `Node.isRunning` alone. The #46 loop refuted it at source:

* `Node.start()` assigns `running = true` at `Node.cs:253`.
* Its FIRST failure return is five lines later, at `Node.cs:258`.
* No failure path clears the flag.

So `running == true` does not mean the node started. It means `start()` got past line 253.
A genuinely failed start would have read as "not a failure", and the user would get a
normal-looking app on a node that never started, with nothing on screen to say so.

`Node.startCounter` is the honest signal. It is incremented at `Node.cs:310`, past
`prepareStorage`, past the wallet read and past `streamProcessor.start()`.
`App.xaml.cs:1399` already asks `Node.startCounter == 0` for this same question.

The test is COMPOUND, not the counter alone, because `Node.stop()` clears `running` and
leaves the counter at its value (`Node.cs:659-669`):

| `running` | `startCounter` | Branch | Result |
|---|---|---|---|
| true | > 0 | first arm | a healthy node. No dialog. Correct. |
| true | 0 | falls through | the zombie. `Node.start()` answers false. The dialog is shown. |
| false | > 0 | falls through | the node was stopped. It is started again. |
| false | 0 | falls through | the first start. |

⚠ **RESIDUAL, named in the code at `Node.cs:225-251`.** A throw between `Node.cs:310` and the
`return true` at `Node.cs:328` leaves `startCounter` at 1 on a start that never completed.
That window is 18 lines. It is named, not closed.

⚠ **`Node.start()` was NOT given a failure unwind.** An honest unwind is not one assignment:
at the first failure return `IxianHandler.status` is already `warmUp` and `UpdateVerify.start()`
has run. A cleared flag admits a SECOND `start()` over half-started Ixian-Core services.
Ixian-Core is FROZEN at `097341a` and is not in this checkout, so that cannot be answered here.
That is BE row **CORE-6**.

⚠ **Deliberately does NOT call `connectToNetwork()` on the already-running arm.** Whether a
repeat `StreamClientManager.start()` / `NetworkClientManager.start(2)` is safe lives in
Ixian-Core and cannot be answered from this tree. That is BE row **CORE-5**.
★ The old reason for this line — *"the node was already connected"* — is no longer the
argument. See the WITHDRAWN box above: nothing in this tree shows a HomePage rebuild dropping
the stream session, and nothing proves the skipped call caused the error storm either.

★ **Why urgent:** F5 rows 1.1–1.8 REQUIRE switching between Deutsch and English. This
defect fires on that switch, so the money path — the batch's whole priority — cannot be
walked without hitting it.

**F2 · `OnUpdateUI` uses `.Last()` on a possibly-empty navigation stack. ✅ SHIPPED, AND THE
FAMILY IS BIGGER THAN THIS ONE LINE.**
Repaired at `HomePage.xaml.cs:3371` and at six sibling sites in `Spixi/Utils/UIHelpers.cs`
(`:48`, `:323`, `:333`, `:343`, `:353`, `:363`), all now
`Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault()`.
⚠ TWO SITES REMAIN, both outside that batch's scope:
`Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs:400` and
`Spixi/Platforms/Android/WebViewRenderer.cs:163`.
The original entry follows.
`HomePage.xaml.cs:3257`: `Page page = Navigation.NavigationStack.Last();` →
`InvalidOperationException: Sequence contains no elements`, logged in the same run. The
2 s tick landed inside the teardown window where the stack is empty. `LastOrDefault()` and
a null check. Caught today, so it is noise rather than a crash — but it is noise that hides
real errors in exactly the window where they matter.

**F3 · `receiveData` dereferences without guards, in two ways. ✅ SHIPPED.**
`StreamProcessor.cs` now tests the null payload ONCE and returns (`:275-278`), and each
`Encoding.UTF8.GetString(spixi_message.data)` call site goes through `safeString`.
The original entry follows.
`StreamProcessor.cs:199+`. Three `Encoding.UTF8.GetString(spixi_message.data)` call sites
with no null check — that is the `ArgumentNullException` above. And in the
`requestFundsResponse` case:

```csharp
FriendMessage? msg = friend.getMessages(0).Find(…);
…
msg.message = ":" + tx_id;            // declared nullable, never checked
msg.message = "::" + msg.message;     // the decline branch, same
```

An unguarded deref on the **network thread**, and the channel is hardcoded to `0`.
⚠ **This batch WIDENED the path into it**: before #636 only a payment produced a
`requestFundsResponse`; Decline now produces one too. So F3 is partly ours to own even
though the code is inherited — same class as queue item 15, on the receive side.


---

## Change log for this file

| Date | Change |
|---|---|
| 2026-08-29 | Written from Damir's Android F5 walk. |
| 2026-08-27 | ⚠ F1 corrected to the SHIPPED shape (`Node.isRunning && Node.startCounter > 0`). The `isRunning`-alone shape is marked superseded, with the reason. BE rows **CORE-5** and **CORE-6** named, using the names fix agent L2 used in the code (`HomePage.xaml.cs:381`, `Node.cs:251`). The "everything else is aftermath" diagnosis is marked WITHDRAWN, not deleted. F2 and F3 marked shipped, and the two remaining `.Last()` sites named. |
