/* ==== The Opus codec: the managed one only (DECISIONS #1905, #1844 (3), packet P103) — Concentus 2.2.2's factory tries a native
 * opus library before its managed codec; with the switch on, Spixi sets `OpusCodecFactory.AttemptToUseNativeLibrary = false`
 * before each factory call, so no native probe runs and the managed codec is made, on every platform.
 * SOURCE PIN (#1735) — LIMITS: OpusDecoder.cs / OpusEncoder.cs compile in csh only over a MODEL of Concentus (scripts/csh/StubsOpus.cs);
 * the app's platform players / recorders and VoiceClips are MAUI-bound and UNCOMPILED here. So the keys hold the comment-stripped
 * TEXT, not bindings: a shadow type named OpusCodecFactory / SmallFixFlags, an alias of Concentus, a `#define`, a csproj
 * `Compile Remove`, reflection, or a factory call inside another package is not seen (the diff review and the Windows compile hold
 * those). What the factory does with the property is upstream's code (the scratch proof in P103, Linux only); that the wrappers
 * reach the managed codec runs in csh (OpusManagedTests). NOT WALKED: Ixian-Core (compiled into the Spixi assembly as shared items)
 * and Spixi-PushService — neither names Concentus today (grep, 2026-11-26); a factory call added there is not seen.
 *   f1 helper    — OpusDecoder.cs holds ONE `internal static void useManagedOnly()` whose body is exactly
 *                  `{ if (SmallFixFlags.OpusManagedOnly) OpusCodecFactory.AttemptToUseNativeLibrary = false; }`; the property is
 *                  named nowhere else in Spixi/**.
 *   f2 decoder   — OpusDecoder.start(): the statement right before `decoder = OpusCodecFactory.CreateDecoder(samples, channels);` is
 *                  `useManagedOnly();`.
 *   f3 encoder   — OpusEncoder.start(): the statement right before `encoder = OpusCodecFactory.CreateEncoder(samples, channels,
 *                  opusApplication);` is `OpusDecoder.useManagedOnly();`.
 *   f4 only door — over every Spixi/**.cs: exactly these two `OpusCodecFactory.Create…` calls and no other `OpusCodecFactory.` use
 *                  but the setter; no `Concentus.Structs`, `Concentus.Native`, `NativeOpus` or `OpusMS` name; every
 *                  `new OpusDecoder(` / `new OpusEncoder(` is in a file with no `using Concentus.Structs` (it is the Spixi wrapper);
 *                  `SmallFixFlags.OpusManagedOnly` is read only in the helper; no bare `CreateDecoder(` / `CreateEncoder(` /
 *                  `CreateMultiStream…(` call beyond the two (a `using static Concentus.OpusCodecFactory;` route), and no `using static
 *                  Concentus…` or `using <alias> = Concentus…` line.
 *   f5 old path  — start() of each wrapper with the helper call taken out equals its base `0eda93f5` body (SHA-256, stripCode,
 *                  whitespace collapsed): the switch OFF runs the base statements and never writes the property.
 *   f6 harness   — csh.csproj compiles the REAL OpusDecoder.cs and OpusEncoder.cs (not a copy); OpusManagedTests.cs holds ≥ 10 tests.
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-fixb5/f-opus-managed`):
 *   helper `= false` → `= true` → f1 (body); OpusDecoder.start: the `useManagedOnly();` statement deleted → f2 (decoder); the helper's
 *   `if (SmallFixFlags.OpusManagedOnly) ` dropped (the setter unconditional) → f1 (body) and f4 (switchOnlyInHelper);
 *   VoiceClips.cs: `using static Concentus.OpusCodecFactory;` added → f4 (noUsingStaticOrAlias); `decoder.start();` →
 *   `decoder.start(); CreateDecoder(16000, 1);` → f4 (bareCreate); `global using OF = global::Concentus.OpusCodecFactory;` added
 *   → f4 (noUsingStaticOrAlias). */
import { createHash } from 'node:crypto';

export const DEC_F = 'Spixi/VoIP/OpusDecoder.cs', ENC_F = 'Spixi/VoIP/OpusEncoder.cs';
export const SETTER = '{ if (SmallFixFlags.OpusManagedOnly) OpusCodecFactory.AttemptToUseNativeLibrary = false; }';
export const CREATE_DEC = 'decoder = OpusCodecFactory.CreateDecoder(samples, channels);';
export const CREATE_ENC = 'encoder = OpusCodecFactory.CreateEncoder(samples, channels, opusApplication);';
/* SHA-256 of rest(start body) at the base 0eda93f5 (git show 0eda93f5:<file>; stripCode; whitespace collapsed) */
export const BASE = { decStart: '6eb4a664a7c6db5d91d7de8e8aa9c0db979ff177d63de258eb47300f7e5eade2', encStart: '6d479d703892fefa3a35cbecdacfc4e4c91655b4fa245a7d5157ad8cd59ceddc' };

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return { o: -1, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return { o, end: k + 1, text: t.slice(o, k + 1) };
  }
  return { o, end: -1, text: '' };
};
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
export const rest = (body) => norm(body.split('OpusDecoder.useManagedOnly();').join('').split('useManagedOnly();').join(''));

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const DEC = rd(DEC_F), ENC = rd(ENC_F);
  const helper = bodyOf(DEC, 'internal static void useManagedOnly()');
  const decStart = bodyOf(DEC, 'public void start()'), encStart = bodyOf(ENC, 'public void start()');

  /* ── f1 · the one setter, under the switch ── */
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const texts = csFiles.map((f) => [f, rd(f)]);
  const sum = (re) => texts.reduce((n, [, t]) => n + count(t, re), 0);
  const f1 = {
    oneHelper: count(DEC, 'static void useManagedOnly(') === 1 && sum(/static void useManagedOnly\(/g) === 1,
    body: norm(helper) === norm(SETTER),
    propertyOnce: sum(/\bAttemptToUseNativeLibrary\b/g) === 1,
  };
  ok(F(f1).length === 0,
    '★ fixb5 f1 helper (#1905, P103): OpusDecoder.useManagedOnly() is the ONE place the factory property is written — `if (SmallFixFlags.OpusManagedOnly) OpusCodecFactory.AttemptToUseNativeLibrary = false;` and nothing else; the property is named nowhere else in Spixi/** — failing: ' + JSON.stringify(F(f1)));

  /* ── f2 / f3 · the helper runs right before each factory call ── */
  const justBefore = (body, call, create) => { const at = body.indexOf(create); return count(body, create) === 1 && at > 0 && norm(body.slice(0, at)).endsWith(call); };
  const f23 = {
    decoder: decStart.length > 20 && justBefore(decStart, 'useManagedOnly();', CREATE_DEC) && count(decStart, 'useManagedOnly(') === 1,
    encoder: encStart.length > 20 && justBefore(encStart, 'OpusDecoder.useManagedOnly();', CREATE_ENC) && count(encStart, 'useManagedOnly(') === 1,
  };
  ok(F(f23).length === 0,
    '★ fixb5 f2 / f3 sites (#1905): OpusDecoder.start() runs `useManagedOnly();` and OpusEncoder.start() runs `OpusDecoder.useManagedOnly();` as the statement right before their factory call — so the property is false before the first decoder or encoder of a process, whichever comes first, on every thread — failing: ' + JSON.stringify(F(f23)));

  /* ── f4 · the two wrappers are the only door to the codec ── */
  const usingStructs = (t) => /using\s+Concentus\.Structs\s*;/.test(t);
  const ctorFiles = texts.filter(([, t]) => /new OpusDecoder\(|new OpusEncoder\(/.test(t));
  const f4 = {
    twoCreates: sum(/OpusCodecFactory\.Create\w*\(/g) === 2 && count(DEC, CREATE_DEC) === 1 && count(ENC, CREATE_ENC) === 1,
    noOtherFactoryUse: sum(/OpusCodecFactory\./g) === 3,
    noDirectCodec: sum(/Concentus\.Structs|Concentus\.Native|\bNativeOpus\w*|\bOpusMS\w*/g) === 0,
    ctorsAreWrappers: ctorFiles.length >= 9 && ctorFiles.every(([, t]) => !usingStructs(t)),
    bareCreate: sum(/\bCreate(?:Decoder|Encoder|MultiStream\w*)\s*\(/g) === 2,
    noUsingStaticOrAlias: sum(/\busing\s+static\s+(?:global::)?Concentus\b|\busing\s+\w+\s*=\s*(?:global::)?Concentus\b/g) === 0,
    switchOnlyInHelper: sum(/\bSmallFixFlags\.OpusManagedOnly\b/g) === 1 && count(helper, 'SmallFixFlags.OpusManagedOnly') === 1,
  };
  ok(F(f4).length === 0,
    '★ fixb5 f4 only door (#1905): over every Spixi/**.cs exactly two OpusCodecFactory.Create… calls (the two wrappers), no other factory use but the setter, no Concentus.Structs / Native / NativeOpus / OpusMS name, every `new OpusDecoder(` / `new OpusEncoder(` site (' + ctorFiles.length + ' files) is the Spixi wrapper, and the switch is read only in the helper — failing: ' + JSON.stringify(F(f4)));

  /* ── f5 · switch OFF = the base start() bodies ── */
  const f5 = { decStart: sha(rest(decStart)) === BASE.decStart, encStart: sha(rest(encStart)) === BASE.encStart };
  ok(F(f5).length === 0,
    '★ fixb5 f5 old path: each start() with the helper call taken out is its base 0eda93f5 body (SHA-256) — with the switch OFF the property is never written (the helper\'s `if`) and the base statements run — failing: ' + JSON.stringify(F(f5)) + ' got ' + sha(rest(decStart)).slice(0, 12) + ' ' + sha(rest(encStart)).slice(0, 12));

  /* ── f6 · the harness runs the REAL wrappers ── */
  const csproj = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const tests = stripCode(raw('scripts/csh/OpusManagedTests.cs'));
  const f6 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/VoIP/OpusDecoder.cs" />') === 1 && count(csproj, '<Compile Include="../../Spixi/VoIP/OpusEncoder.cs" />') === 1,
    noRemove: !/Compile Remove/.test(csproj),
    tests: count(tests, /\[TestMethod\]/g) >= 10,
  };
  ok(F(f6).length === 0,
    '★ fixb5 f6 harness: csh.csproj compiles the REAL OpusDecoder.cs and OpusEncoder.cs over the Concentus model, and OpusManagedTests.cs holds ≥ 10 tests — failing: ' + JSON.stringify(F(f6)));
}
