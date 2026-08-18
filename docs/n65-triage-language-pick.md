# N65 — the language pick. Triage at source, 2026-08-18 (#385)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Damir saw this on Windows in ONE frame (F5 2026-08-18, two screenshots):

| Surface | Showed |
|---|---|
| Account hub copy | French |
| the "Language" row VALUE | Deutsch |
| the picker CHECKMARK | Português (Brasil) |
| the rest of the app | German |

He picked `pt-br`. Nothing changed.

---

## 1. What this session PROVED, without a device

### 1.1 The handler could fail silently. It cannot any more.

`SettingsPage.xaml.cs` gates the preference write, the `setLocale` push,
`HomePage.reloadShell()` and every live chat reload on one call:

```csharp
if (SpixiLocalization.loadLanguage(lang)) { ... }   // false = total no-op
```

`loadLanguage` returned `false` from two places with **no log line at all**.
Both now name the file and the line. The handler logs the request, the result
and the code that ended up active (#385).

### 1.2 A duplicate key could THROW out of `loadLanguage`

The parse loop called `Dictionary.Add`. A duplicate key throws
`ArgumentException`. Nothing caught it, so the exception left `loadLanguage`,
passed through the `Navigating` handler that calls it, and leaked the open
asset stream. In that case even the `else` branch does not run: the pick is a
no-op with no preference write and no log. The loop is now wrapped.

### 1.3 The language files are clean

All 13 files in `Spixi/Resources/Raw/lang/` were checked:

* no UTF-8 BOM,
* no duplicate key,
* no line that lacks a `=` separator (comments and blank lines excluded).

So `loadLanguage("pt-br")` **cannot** return false for a parse reason.

### 1.4 The asset read works on Windows

`de-de` loads on Windows — the app was showing German. The Windows
`getAsset` goes through `FileSystem.Current.OpenAppPackageFileAsync`, and MAUI
normalises the `Path.Combine("lang", …)` separator. A failure here would also
break the boot load, which demonstrably works.

**Conclusion:** the leading hypothesis is now that `loadLanguage` returns
**TRUE** and the four surfaces disagree afterwards. The log line from §2
settles it.

---

## 2. The device protocol — one line answers it

Deploy the batch and pick a language. Read `ixian.log` (DevPage shares it).

```
Language pick: requested 'pt-br', loaded=True, active now 'pt-br'
```

| The log says | Read it as | Next step |
|---|---|---|
| `loaded=False` + a "Language file … error on line N" line | the file is refused | fix that line; the parse is the fault |
| `loaded=False` + no file error | the ASSET READ failed | look at `SPlatformUtils.getAsset` on Windows |
| the line is ABSENT | the handler never ran | the verb never arrived — look at the shell emit and `onNavigatingGlobal` |
| `loaded=True` | the load works | go to §3, the state split |

---

## 3. If the load works: the FOUR sources, separately

Do not treat this as one bug. Each surface has its own source of truth.

| # | Surface | Where it comes from | How it can go stale |
|---|---|---|---|
| 1 | Account hub copy | `window.SL`, from `SpixiStrings.get()`. Boot value = the `*SL{language-code}` carrier baked at `generatePage`; live value = the `setLocale` push (`settings.html setLocale`) | the push never arrives, or arrives with a code that has no FE dictionary — `get()` then silently returns **en-us**, it never returns null |
| 2 | the "Language" row VALUE | the `setLanguage` push, `SettingsPage.onLoad` → `SpixiLocalization.getCurrentLanguage()` | only pushed at `onLoad`; a pick does not re-push it |
| 3 | the picker CHECKMARK | `state.language` in the shell, set by the pick itself and by `setLanguage` | the shell sets it OPTIMISTICALLY at the pick, before C# answers |
| 4 | the rest of the app | `*SL{}` carriers baked per page + `reloadShell()` + the live chat reloads | a reload that does not regenerate, or a surface in no reload collection (the #251/#288 class) |

Note ③ against ①: the shell moves the checkmark on the tap, and the C# side
can refuse the same pick a moment later. That alone produces "checkmark on
pt-br, everything else on the old language". It is the first thing to check.

Note ① again: `SpixiStrings.get()` falls back to en-us for any code with no
bundled dictionary, so a MISSING FE dictionary shows as English copy, never as
an error.

---

## 4. Not this session

The four-way split needs the §2 line first (#215). The launch-page language
pick (`LaunchPage.xaml.cs`) shares `loadLanguage` and gets the new logging for
free, but it was not otherwise touched.
