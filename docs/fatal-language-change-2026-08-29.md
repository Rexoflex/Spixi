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

## Everything else in that log is aftermath, not cause

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

**F1 · the false fatal (URGENT — it blocks the money-path walk).**
`HomePage` must not treat "already running" as a start failure. `Node.isRunning`
(`Node.cs:74`) is a public static property, so the distinction is available today:

```csharp
if (Node.isRunning)
{
    Logging.info("HomePage start block re-entered on an already-running node — not a failure.");
}
else if (!Node.start()) { …fatal…; return; }
else { Node.connectToNetwork(); }
```
⚠ Deliberately does NOT call `connectToNetwork()` a second time. Whether a repeat call is
safe is not answerable from this tree, and the node was already connected.

★ **Why urgent:** F5 rows 1.1–1.8 REQUIRE switching between Deutsch and English. This
defect fires on that switch, so the money path — the batch's whole priority — cannot be
walked without hitting it.

**F2 · `OnUpdateUI` uses `.Last()` on a possibly-empty navigation stack.**
`HomePage.xaml.cs:3257`: `Page page = Navigation.NavigationStack.Last();` →
`InvalidOperationException: Sequence contains no elements`, logged in the same run. The
2 s tick landed inside the teardown window where the stack is empty. `LastOrDefault()` and
a null check. Caught today, so it is noise rather than a crash — but it is noise that hides
real errors in exactly the window where they matter.

**F3 · `receiveData` dereferences without guards, in two ways.**
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
