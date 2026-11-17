/* ==== fixb1 · B (item 2, P53, #1645) — Android: the button texts of the native system dialog in dark mode.
 *
 * THE MECHANISM: AppCompat alert-dialog buttons take ?attr/colorAccent. SpixiAlertDialog has a DayNight parent, so its
 * SURFACE follows the OS mode, but its colorAccent was ONE fixed #3050BD (AND-14 #334) → about 1.4 : 1 on the dark
 * surface. The accent is now the colour resource `spixiDialogAccent` (day in values/colors.xml, night in
 * values-night/colors.xml). The -night qualifier and the DayNight surface follow the same OS mode (the app does not pin
 * UserAppTheme), so the button colour and the surface always agree.
 *
 * THIS PIN READS THE XML FILES, not a list of its own: it finds the SpixiAlertDialog style in values/styles.xml, follows
 * its colorAccent references to @color/spixiDialogAccent, resolves the day value from values/colors.xml and the night
 * value from values-night/colors.xml, and computes the WCAG 2.x contrast against the two surfaces.
 * ⚠ THE TWO SURFACES ARE APPCOMPAT'S LIBRARY VALUES, NOT OURS: Theme.AppCompat.DayNight.Dialog.Alert paints the dialog
 * with background_floating_material_light = #FFFFFF (day) and background_floating_material_dark = #424242 (night). If a
 * newer AppCompat changes them, this pin must be re-read against the library, not "fixed" towards the old numbers.
 *   KEYS — found (style present, colour resources present) · bothSpellings (colorAccent AND android:colorAccent point at
 *          @color/spixiDialogAccent) · parent (Theme.AppCompat.DayNight.Dialog.Alert) · dayContrast (≥ 4.5 on #FFFFFF) ·
 *          nightContrast (≥ 4.5 on #424242) · nightDiffers (the night value is not the day value).
 * Deliberate breaks (#802, one at a time, restored): night value back to #3050BD → red `nightContrast` + `nightDiffers`;
 * the android:colorAccent line removed → red `bothSpellings`; parent → Theme.AppCompat.Dialog.Alert → red `parent`.
 * No run-time switch (a resource-only change); a revert = the three edits (colors.xml, values-night/colors.xml, styles.xml). */
export default async function (h) {
  const { ok, root, readFileSync, existsSync, join } = h;
  const R = 'Spixi/Platforms/Android/Resources/';
  const read = (f) => (existsSync(join(root, R + f)) ? readFileSync(join(root, R + f), 'utf8').replace(/<!--[\s\S]*?-->/g, '') : '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);

  const styles = read('values/styles.xml');
  const dayXml = read('values/colors.xml');
  const nightXml = read('values-night/colors.xml');

  const styleM = /<style\s+name="SpixiAlertDialog"\s+parent="([^"]*)"\s*>([\s\S]*?)<\/style>/.exec(styles);
  const parent = styleM ? styleM[1] : '';
  const items = styleM ? [...styleM[2].matchAll(/<item\s+name="([^"]+)"\s*>([^<]*)<\/item>/g)].map((m) => [m[1], m[2].trim()]) : [];
  const item = (n) => { const x = items.filter(([k]) => k === n); return x.length === 1 ? x[0][1] : null; };
  const REF = '@color/spixiDialogAccent';
  const color = (xml, name) => {
    const m = new RegExp('<color\\s+name="' + name + '"\\s*>\\s*(#[0-9A-Fa-f]{6})\\s*</color>').exec(xml);
    return m ? m[1].toUpperCase() : null;
  };
  const refName = (v) => (v && /^@color\/([A-Za-z0-9_]+)$/.exec(v) ? /^@color\/([A-Za-z0-9_]+)$/.exec(v)[1] : null);

  const dayHex = color(dayXml, refName(item('colorAccent')) || 'spixiDialogAccent');
  const nightHex = color(nightXml, refName(item('colorAccent')) || 'spixiDialogAccent');

  /* WCAG 2.x relative luminance and contrast ratio */
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DAY_SURFACE = '#FFFFFF', NIGHT_SURFACE = '#424242';   // AppCompat library values (background_floating_material_light / _dark), not ours
  const dayC = dayHex ? contrast(dayHex, DAY_SURFACE) : 0;
  const nightC = nightHex ? contrast(nightHex, NIGHT_SURFACE) : 0;

  const k = {
    found: !!styleM && !!dayHex && !!nightHex,
    bothSpellings: item('colorAccent') === REF && item('android:colorAccent') === REF,
    parent: parent === 'Theme.AppCompat.DayNight.Dialog.Alert',
    dayContrast: dayC >= 4.5,
    nightContrast: nightC >= 4.5,
    nightDiffers: !!dayHex && !!nightHex && dayHex !== nightHex,
  };
  ok(F(k).length === 0,
    '★ fixb1 B (item 2, P53): SpixiAlertDialog (parent Theme.AppCompat.DayNight.Dialog.Alert) takes colorAccent AND android:colorAccent from @color/spixiDialogAccent; the day value ' + dayHex + ' is ' + dayC.toFixed(2) + ' : 1 on AppCompat\'s #FFFFFF and the night value ' + nightHex + ' is ' + nightC.toFixed(2) + ' : 1 on AppCompat\'s #424242 (both ≥ 4.5) — failing: ' + JSON.stringify(F(k)),
    { dayHex, nightHex, dayContrast: dayC, nightContrast: nightC, parent, items });
}
