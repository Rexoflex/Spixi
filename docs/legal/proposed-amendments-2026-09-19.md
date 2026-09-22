# Privacy Policy — two proposed amendments (2026-09-19, DECISIONS #906)

**Status: PROPOSED. Nothing in `privacy-policy.md` was changed.** The policy is legal copy and the
wording is Damir's. #899 established that the document carries no open markers; the #46 review then
checked whether the text is TRUE of the app that ships. Two places are not. Both matter more now than
a week ago, because the next reader is counsel, who will take the document as final.

If either text below is accepted: edit `docs/legal/privacy-policy.md`, move `Last updated`, then
`node scripts/build-legal-docs.mjs` and `--check`.

---

## 1 · §4.8 Mini Apps — the policy describes the catalog, not the apps (MAJOR)

**Today (`privacy-policy.md:115-117`):**

> Mini Apps are listed at `apps.spixi.io` and open in your device's browser. Once you leave the app,
> this Policy stops applying and the operator's own terms and privacy practices govern.

**What the code does.** That sentence is true of the *catalog link* — the Explore banner sends
`ixian:spixiAppsLink` and C# opens the website in the external browser. It is not true of an
*installed* Mini App, which runs **inside Spixi**, in an in-app WebView, with a bridge to the host:

```csharp
// Spixi/Pages/MiniApps/MiniAppPage.xaml.cs:57-60
var source = new UrlWebViewSource();
source.Url = "file://" + app_entry_point;
webView.Source = source;
```

The app says the same thing to the user in the opposite direction — `src/components/apps-details.js:326`:
**"Runs securely inside Spixi."** §4.8 is the only section on Mini Apps, and it disclaims the Policy
for third-party code that executes in-app.

**Proposed replacement (a draft — the facts are checked, the voice is yours):**

> ### 4.8 Mini Apps
>
> **The catalog.** Mini Apps are listed at `apps.spixi.io`. The catalog opens in your device's browser;
> once you are there, this Policy stops applying and the website's own terms govern.
>
> **An installed Mini App.** When you install a Mini App it is downloaded to your device and runs
> inside Spixi, in a separate web view. It is third-party software: its author, not Ixian, decides what
> it does with anything you enter into it, and the author's own terms and privacy practices apply to
> that. A Mini App cannot read your wallet keys, your password or your conversations. It can exchange
> data with the other participants of a session you start or join, and it can make network requests of
> its own, which reveal your IP address to whoever it contacts. Install Mini Apps only from authors you
> trust, and remove one from Apps → the app → Uninstall.

⚠ **Two sentences in that draft are claims the BE engineer should confirm before they are published**,
because `docs/security-handover-gate.md` records open exposure on exactly this surface:

* "cannot read … your conversations" — storage is partitioned from the app's on **iOS and Android**
  (Session R). **Windows and MacCatalyst are NOT partitioned** (the gate's own row, with its one-line
  device test). Either scope the sentence to what is true, or land the partition first.
* permissions — on **Android** the WebView grants a page's permission requests unconditionally
  (`WebViewRenderer.cs:53-56`, security-review MAJOR #9, inherited). §4.11's "each is used only for
  the feature that requests it" is not true of a Mini App on Android today.

The honest minimum, if those are not settled before launch, is the first two paragraphs without the
"cannot read" sentence.

---

## 2 · §4.7 — the one outbound request a *sender* can trigger is not listed (MINOR)

§4.7 names the hourly version check and the thirty-minute price check because they "reveal your IP
address and the fact that a Spixi client is running". The same is true of one more request, and this
one is triggered by whoever sends you a message:

* opening a conversation that contains a GIF or image link **fetches it automatically**
  (`src/shells/chat.html` — `mediaAutoloadOn()` defaults to ON);
* the hosts are limited to **Tenor, Giphy and `apps.spixi.io`** (Session R narrowed it back from
  any-host to the baseline's allow-list);
* the fetch tells that host your IP address and *when you opened the conversation*.

**Proposed addition (after 4.7, or as its last paragraph):**

> **Images and GIFs in chats.** When a message contains a link to an image or GIF hosted by Tenor,
> Giphy or `apps.spixi.io`, the app loads it when you open the conversation. Like any web request,
> this reveals your IP address to that host, and the time you opened the conversation. Links to any
> other host are never loaded automatically; they open only when you tap them and confirm.

The switch exists and is reachable — **Account → Privacy** writes `spixi.media.autoload`
(`settings.html:1575`, `settings-screens.js createPrivacy`; Session R found the key had a reader and
no writer, and built the writer). ⚠ My first draft of this paragraph said there was NO toggle, from
the Session R status row — the sweep's finding, not the tree's state (#660, caught before it left
the session). So the addition can honestly end with:

> You can turn this off in Account → Privacy; it then applies to every conversation you open
> afterwards.

The row ships as **"Load pictures and GIFs"** (`loadMedia`), sub-line "Loading tells the sender’s host that you opened the chat" — the policy can quote it.

---

## 3 · What "delete" does — one honest sentence (added 2026-09-20, DECISIONS #909)

The policy should not let a reader assume more than the app does. Today, deleting a message erases its
CONTENT on your device and asks the other device to do the same; the other device does so when it next
receives the request. The record that a message existed (time, sender, type) and any file that was
transferred stay on the device until the conversation or the app is removed, and history on the device
is not encrypted at rest (be-cutover CORE-9 / CORE-11).

**Proposed sentence (§ on messages / retention):**

> Deleting a message removes its content from your device and asks the other participant's device to
> remove it too, which happens once that device is online. A record that a message was exchanged, and
> any file that was transferred, remain on the device until you delete the conversation or the app.

Revisit the second sentence when CORE-9 lands — it should then simply go.
