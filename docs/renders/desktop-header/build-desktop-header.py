#!/usr/bin/env python3
"""DC-SCREEN-W render (ADDENDUM-D §D4): the About and Contributors headers in the DESKTOP peer pane.

Regenerates every PNG in this folder plus contrast.json, from the BUILT settings shell
(Spixi/Resources/Raw/html/settings.html) — src/ is not touched.

  python3 docs/renders/desktop-header/build-desktop-header.py        (from the repo root, or anywhere)

Frames: {about, contributors} × {light, dark} × {today, a, b}. One frame = the pane at 1128 × 800 CSS px
(a 1200 px window minus the 72 px home rail; the hub column at its default 328 px), `?pane=1`
(the browser-preview forcing of setPaneMode), reduced motion (static art, repeatable pixels), DPR 1.

Contrast: the bar title and the back icon are measured against what is REALLY behind them — the frame is
re-shot with the title glyphs and the icon made transparent, and every background pixel inside the
title's text box (a DOM Range over its text node) / the icon's box is compared with the computed ink.
Reported: the worst pixel (min) and the median. The title's text-shadow is ignored (conservative).
Gates: title ≥ 4.5 : 1 (the D4 pin), icon ≥ 3 : 1 (WCAG 1.4.11).

Theme: the shell's head-top `var n='*SL{SpixiThemeName}'` is replaced with 'light' / 'dark' in a temp copy
NEXT TO the original (so relative assets resolve); the copy is deleted afterwards.
"""
import json, pathlib, statistics, sys
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
HTML = REPO / 'Spixi' / 'Resources' / 'Raw' / 'html'
SHELL = HTML / 'settings.html'
MARK = "var n='*SL{SpixiThemeName}'"
W, H = 1128, 800
W_NARROW = 720   # stress: the detail region at 392 px (the shell keeps >= 320, settings.html :120-:128)
SCREENS = {'about': 'About', 'contributors': 'Contributors'}
THEMES = ['light', 'dark']
OPTIONS = {'today': None, 'a': HERE / 'option-a.css', 'b': HERE / 'option-b.css'}

HIDE_INK = """
.c-settings-about--hdr > .c-topbar .c-topbar__title, .c-settings-contrib--hdr > .c-topbar .c-topbar__title { color: transparent !important; text-shadow: none !important; }
.c-settings-about--hdr > .c-topbar > .c-button svg, .c-settings-contrib--hdr > .c-topbar > .c-button svg { visibility: hidden !important; }
"""

PROBE = """() => {
  const scr = document.querySelector('.c-settings-about--hdr, .c-settings-contrib--hdr');
  const bar = scr.querySelector('.c-topbar');
  const t = bar.querySelector('.c-topbar__title');
  const btn = bar.querySelector('.c-button');
  const svg = btn.querySelector('svg');
  const band = scr.querySelector('.c-settings-contrib__band, .c-settings-about__band');
  const body = scr.querySelector('.c-settings__body');
  const r = (x) => { const b = x.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 10) / 10); };
  const range = document.createRange(); range.selectNodeContents(t);
  const tb = range.getBoundingClientRect();
  return {
    screen: scr.className,
    bar: r(bar), barBg: getComputedStyle(bar).backgroundColor, barPos: getComputedStyle(bar).position,
    title: t.textContent, titleText: [tb.left, tb.top, tb.width, tb.height],
    titleInk: getComputedStyle(t).color, titleSize: getComputedStyle(t).fontSize, titleWeight: getComputedStyle(t).fontWeight,
    icon: r(svg), iconInk: getComputedStyle(btn).color,
    band: r(band), body: r(body),
  };
}"""


def rgb(s):
    v = s[s.index('(') + 1:s.index(')')].replace('/', ',').split(',')
    return tuple(int(round(float(x))) for x in v[:3])


def lum(c):
    def ch(u):
        u /= 255
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def sample(img, box, ink):
    x, y, w, h = box
    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(img.width, int(x + w + 0.999)), min(img.height, int(y + h + 0.999))
    px = img.crop((x0, y0, x1, y1)).convert('RGB')
    data = list(px.get_flattened_data() if hasattr(px, 'get_flattened_data') else px.getdata())
    if data and not isinstance(data[0], tuple):
        data = [tuple(data[i:i + 3]) for i in range(0, len(data), 3)]
    cs = [contrast(ink, p) for p in data]
    worst_px = min(data, key=lambda p: contrast(ink, p))
    return {'min': round(min(cs), 2), 'median': round(statistics.median(cs), 2),
            'worstBg': '#%02x%02x%02x' % worst_px, 'n': len(cs)}


PHONE_UA = ('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/126.0.0.0 Mobile Safari/537.36')


def shoot(browser, th, key, label, opt, css, phone=False, width=W, tag=None):
    """One frame: open the screen, screenshot, then measure the bar ink against what is behind it."""
    if phone:   # the phone reference: a mobile UA (no data-desktop), 412 x 915, a 24 px status-bar inset
        ctx = browser.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=1, is_mobile=True,
                                  has_touch=True, user_agent=PHONE_UA, reduced_motion='reduce', color_scheme=th)
        url = (HTML / f'_dh_render_{th}_phone.html').as_uri()
    else:
        ctx = browser.new_context(viewport={'width': width, 'height': H}, device_scale_factor=1,
                                  reduced_motion='reduce', color_scheme=th)
        url = (HTML / f'_dh_render_{th}.html').as_uri() + '?pane=1'
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    pg.wait_for_load_state('load')
    pg.wait_for_timeout(600)
    if css:
        pg.add_style_tag(content=css.read_text(encoding='utf-8'))
    pg.locator('.c-settings__row', has_text=label).first.click()
    pg.wait_for_timeout(1800)
    name = f'{key}-{th}-{tag or opt}.png'
    pg.screenshot(path=str(HERE / name))
    geo = pg.evaluate(PROBE)
    pg.add_style_tag(content=HIDE_INK)
    pg.wait_for_timeout(100)
    bgshot = HERE / f'.bg-{name}'
    pg.screenshot(path=str(bgshot))
    img = Image.open(bgshot)
    title = sample(img, geo['titleText'], rgb(geo['titleInk']))
    icon = sample(img, geo['icon'], rgb(geo['iconInk']))
    img.close()
    bgshot.unlink()
    ctx.close()
    print(f"{name:34s} title {title['min']:5.2f} (med {title['median']:5.2f}, worst bg {title['worstBg']} vs ink {geo['titleInk']})"
          f"  icon {icon['min']:5.2f}  band {geo['band']}  bar {geo['barBg']}  {'ERR ' + errs[0][:80] if errs else ''}")
    return {'png': name, 'geo': geo, 'title': title, 'icon': icon,
            'titlePass': title['min'] >= 4.5, 'iconPass': icon['min'] >= 3.0, 'errors': errs}


def main():
    out = {'viewport': [W, H], 'narrow': [W_NARROW, H], 'frames': {}}
    temps = []
    try:
        src = SHELL.read_text(encoding='utf-8')
        if MARK not in src:
            sys.exit('theme marker not found in the built shell')
        for th in THEMES:
            t = HTML / f'_dh_render_{th}.html'
            t.write_text(src.replace(MARK, f"var n='{th}'"), encoding='utf-8')
            t2 = HTML / f'_dh_render_{th}_phone.html'
            t2.write_text(src.replace(MARK, f"var n='{th}'").replace("a('*SL{AndroidInsetTop}')", "a('24')"),
                          encoding='utf-8')
            temps += [t, t2]
        with sync_playwright() as p:
            # classic (non-overlay) scrollbars, as WebView2 on Windows draws them: Playwright's headless default
            # (--hide-scrollbars) would hide the gutter that cuts the band's right edge
            browser = p.chromium.launch(ignore_default_args=['--hide-scrollbars'])
            for th in THEMES:
                for key, label in SCREENS.items():
                    out['frames'][f'{key}-{th}-phone'] = shoot(browser, th, key, label, 'phone', None, phone=True)
                for opt, css in OPTIONS.items():
                    for key, label in SCREENS.items():
                        out['frames'][f'{key}-{th}-{opt}'] = shoot(browser, th, key, label, opt, css)
                for opt in ('a', 'b'):
                    for key, label in SCREENS.items():
                        out['frames'][f'{key}-{th}-{opt}-narrow'] = shoot(browser, th, key, label, opt, OPTIONS[opt],
                                                                          width=W_NARROW, tag=f'{opt}-narrow')
            browser.close()
    finally:
        for t in temps:
            t.unlink(missing_ok=True)
    (HERE / 'contrast.json').write_text(json.dumps(out, indent=1), encoding='utf-8')
    write_page(out)


# ---------------------------------------------------------------- the review page (numbers from this run)
PAGE_CSS = """
/* layout: one reading column; each state is a 2-up grid of pane frames, each frame captioned with its measured contrast */
:root {
  --bg: #f3f5f7; --panel: #ffffff; --fg: #131415; --muted: #4f5664; --line: #dde2e9;
  --accent: #3050bd; --tag: rgba(48, 80, 189, .10); --ok: #007030; --bad: #b42318;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "SF Mono", "Roboto Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1113; --panel: #1a1c1f; --fg: #e8ecee; --muted: #bbbec4; --line: #2a2d31;
    --accent: #98b5fc; --tag: rgba(118, 157, 255, .14); --ok: #69b67a; --bad: #ff8a80; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0f1113; --panel: #1a1c1f; --fg: #e8ecee; --muted: #bbbec4; --line: #2a2d31;
  --accent: #98b5fc; --tag: rgba(118, 157, 255, .14); --ok: #69b67a; --bad: #ff8a80; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.55 var(--sans); }
.page { max-width: 1240px; margin: 0 auto; padding-block: 28px 72px; padding-inline: 16px; }
h1 { margin: 0 0 6px; font-size: 28px; line-height: 1.2; letter-spacing: -.4px; text-wrap: balance; }
h2 { margin: 0; font-size: 22px; line-height: 1.25; text-wrap: balance; }
h3 { margin: 22px 0 10px; font-size: 15px; }
p, li { max-width: 80ch; }
.lede, .sub { color: var(--muted); }
.sub { margin: 4px 0 18px; }
code { font: 13px/1.4 var(--mono); }
section { margin-top: 44px; }
.head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.tag { font: 700 11px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--accent); background: var(--tag); padding: 6px 8px; border-radius: 6px; }
.rec { margin-top: 24px; padding: 16px 18px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
.rec h2 { font-size: 18px; margin-bottom: 6px; }
.rec p { margin: 6px 0; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 18px; }
.grid.small { grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 760px) { .grid, .grid.small { grid-template-columns: minmax(0, 1fr); } }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: auto; border: 1px solid var(--line); border-radius: 6px; }
figcaption { margin-top: 8px; font: 12.5px/1.45 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
figcaption b { color: var(--fg); font-family: var(--sans); font-size: 13.5px; }
.pass { color: var(--ok); font-weight: 700; }
.fail { color: var(--bad); font-weight: 700; }
.tbl { overflow-x: auto; margin-top: 10px; }
table { border-collapse: collapse; width: 100%; min-width: 640px; background: var(--panel); border: 1px solid var(--line); font-size: 14px; }
th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); }
th { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
ul { padding-inline-start: 20px; }
"""


def cap(fr, label):
    t, i = fr['title'], fr['icon']
    tc = 'pass' if fr['titlePass'] else 'fail'
    ic = 'pass' if fr['iconPass'] else 'fail'
    return (f"<b>{label}</b><br>title {t['min']:.2f} : 1 <span class=\"{tc}\">{'PASS' if fr['titlePass'] else 'FAIL'}</span>"
            f" · median {t['median']:.2f} · worst ground {t['worstBg']}<br>"
            f"back icon {i['min']:.2f} : 1 <span class=\"{ic}\">{'PASS' if fr['iconPass'] else 'FAIL'}</span> (3 : 1)")


def grid(out, suffix, small=False):
    cells = []
    for key, sl in SCREENS.items():
        for th in THEMES:
            fr = out['frames'][f'{key}-{th}-{suffix}']
            cells.append(f'<figure><img src="{fr["png"]}" alt="{sl}, {th} theme, {suffix}" loading="lazy">'
                         f'<figcaption>{cap(fr, f"{sl} · {th}")}</figcaption></figure>')
    return f'<div class="grid{" small" if small else ""}">' + ''.join(cells) + '</div>'


def write_page(out):
    f = out['frames']
    m = lambda k: f"{f[k]['title']['min']:.2f}"
    html = f"""<title>Spixi Desktop Headers</title>
<style>{PAGE_CSS}</style>
<div class="page">
<h1>About and Contributors headers on desktop</h1>
<p class="lede">DC-SCREEN-W (ADDENDUM-D §D4). The Account peer pane, rendered from the built settings shell at 1128 × 800
(a 1200-px window minus the 72-px rail; detail region 800 px). Every frame lists the bar title's contrast against the pixels
really behind it: the glyphs are hidden, the ground inside the title's text box is sampled, the worst pixel decides.
The pin needs 4.5 : 1 for the title and 3 : 1 for the back icon. The text-shadow is ignored. Reduced motion, so the art is a still frame.</p>

<div class="rec">
<h2>Recommendation: option B</h2>
<p>B uses the pane's own bar, the same as every other Account sublevel: the title spans the detail width, the content holds
the 640-px column, and the ground is one flat surface (#245b, #1080 F5). The title is {m('about-light-b')} : 1 in light and
{m('about-dark-b')} : 1 in dark on both screens and both widths. The contrast comes from tokens, not from art, so a
plain token pin proves it. B costs about 45 CSS lines and no new colour.</p>
<p>A is the phone's look and passes too ({m('about-light-a')} / {m('contributors-light-a')} : 1 light,
{m('about-dark-a')} / {m('contributors-dark-a')} : 1 dark). It needs a new top scrim, the scrollbar hidden on these two
screens, a Mac title-bar check, and a pixel pin, because its contrast depends on where the art falls.</p>
</div>

<section>
<div class="head"><span class="tag">Today</span><h2>The band is cut and the light title is invisible</h2></div>
<p class="sub">The 640-px content cap (<code>settings.html:138</code>) also caps the scroller that holds the band. The pane bar
paints the settings ground (<code>settings.html:148</code>) over the band's top 56 px, but keeps the header's white ink
(<code>settings-app.css:949–959</code>). Light: {m('about-light-today')} : 1. Dark: the ink still reads ({m('about-dark-today')} : 1), but the band is cut the same way.</p>
{grid(out, 'today')}
</section>

<section>
<div class="head"><span class="tag">Option A</span><h2>Full-width band under a transparent bar</h2></div>
<p class="sub">The scroller spans the pane, and the column becomes padding. The band bleeds edge to edge at the phone's height
(234 / 220). The art is held at phone scale in a 430-px column that feathers into a ground of the art's own tokens. A navy
scrim under the bar keeps the white ink at 4.5 : 1 or more. The bar is transparent until the band scrolls under it.
Spec: <code>option-a.css</code>.</p>
{grid(out, 'a')}
<h3>Option A on a narrow pane (720-px window, detail 392 px)</h3>
{grid(out, 'a-narrow', small=True)}
</section>

<section>
<div class="head"><span class="tag">Option B</span><h2>Rounded band card, normal pane bar</h2></div>
<p class="sub">The bar is back in the flow with the theme ink and the heading-sm title. The band is a card that lines up with the
column's cards (radius 24 on Contributors, like its names card; 16 on About, like its settings cards). The art uses the same
phone-scale column as A, so the heart and the app tile are no longer cropped. Spec: <code>option-b.css</code>.</p>
{grid(out, 'b')}
<h3>Option B on a narrow pane (720-px window, detail 392 px)</h3>
{grid(out, 'b-narrow', small=True)}
</section>

<section>
<div class="head"><span class="tag">Reference</span><h2>The phone today</h2></div>
<p class="sub">412 × 915 with a 24-px status-bar inset. This is the look option A copies. The phone header does not reach 4.5 : 1
either: the twinkles and bokeh sit under the title (About light {m('about-light-phone')}, Contributors light
{m('contributors-light-phone')}, Contributors dark {m('contributors-dark-phone')}). This is outside D4, which is desktop only.</p>
{grid(out, 'phone', small=True)}
</section>

<section>
<div class="head"><span class="tag">Compare</span><h2>Cost and risk</h2></div>
<div class="tbl"><table>
<tr><th></th><th>Option A · full width</th><th>Option B · card</th></tr>
<tr><td>Title contrast (min)</td><td>{m('about-light-a')} – {m('contributors-dark-a')} : 1; narrow {m('about-light-a-narrow')} – {m('about-dark-a-narrow')}</td><td>{m('about-light-b')} light · {m('about-dark-b')} dark</td></tr>
<tr><td>Source of the contrast</td><td>Art position plus a new scrim</td><td>Tokens (the pane bar)</td></tr>
<tr><td>Pin</td><td>A Chromium pixel pin, or a token composite plus a geometry assumption</td><td>A jsdom token pin. Break: drop the ink reset, and the pin reads 1.05 : 1</td></tr>
<tr><td>New values</td><td>2 scrim colours, a container query, masks</td><td>Masks only (the shared art column)</td></tr>
<tr><td>Side effects</td><td>Scrollbar hidden on 2 screens; the Mac title-bar hairline crosses the band</td><td>None found</td></tr>
<tr><td>CSS</td><td>~70 lines in the <code>settings.html</code> pane block</td><td>~45 lines in the same place</td></tr>
</table></div>
<p class="sub">Full notes: <code>PORT.md</code>. Regenerate: <code>python3 docs/renders/desktop-header/build-desktop-header.py</code>.</p>
</section>
</div>
"""
    (HERE / 'desktop-header-render.html').write_text(html, encoding='utf-8')


if __name__ == '__main__':
    main()
