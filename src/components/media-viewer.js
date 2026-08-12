/**
 * c-mviewer — full-screen media viewer (#86 last v1 gap): the c-mbubble
 * onOpen target. V1 = fit-to-screen + close (+ optional Save); pinch/zoom is
 * post-v1 (#86 note). Rides the overlay stack (#56): Esc, ✕ and
 * swipe-to-dismiss close it (the viewer covers the scrim, so scrim-tap is
 * unreachable — freeze audit); focus contained, back-hook via
 * dismissTopOverlay.
 *
 * openMediaViewer({ host, src, alt, kind, onSave, strings }) → el
 *   onSave — shell hook (P2P: saving = local file op via bridge); omitted =
 *   no Save button.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { openOverlay, dismissOverlay, setOverlayOpts } from './overlay.js';

export function openMediaViewer({
  host,
  src = '',
  alt = '',
  kind = 'image',
  onSave,
  strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-mviewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', alt || (kind === 'gif' ? 'GIF' : (strings.image || 'Image')));
  el.tabIndex = -1;

  // #336 (Damir F5 iOS #1): the close ✕ used to live in a TOP bar with no
  // safe-area inset — on iOS edge-to-edge it sat UNDER the status bar and
  // wasn't tappable. The top bar now carries only the caption + optional Save
  // (with the top inset), and CLOSE moved to a prominent bottom-centered button
  // (below). A top bar renders only when there's something to show.
  if (alt || onSave) {
    const bar = document.createElement('div');
    bar.className = 'c-mviewer__bar';
    if (onSave) {
      const spacer = document.createElement('span');   // balance the Save button so the caption stays centered
      spacer.className = 'c-mviewer__spacer';
      spacer.setAttribute('aria-hidden', 'true');
      bar.append(spacer);
    }
    if (alt) {
      const cap = document.createElement('span');
      cap.className = 'c-mviewer__caption';
      cap.textContent = alt;
      bar.append(cap);
    }
    if (onSave) {
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'c-mviewer__btn';
      save.setAttribute('aria-label', strings.save || 'Save');
      save.append(icon('download', { size: 22 }));
      save.addEventListener('click', () => onSave());
      bar.append(save);
    }
    el.append(bar);
  }

  const stage = document.createElement('div');
  stage.className = 'c-mviewer__stage';
  const img = document.createElement('img');
  img.className = 'c-mviewer__img';
  img.src = src;
  img.alt = ''; // the dialog carries the accessible name
  img.draggable = false; // mouse-drag fix: native image drag hijacked the pointer stream
  stage.append(img);
  el.append(stage);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  // #336 (Damir F5 iOS #1): prominent bottom-centered CLOSE — easy to spot + reach,
  // clear of the notch/status bar, with the home-indicator safe-area inset.
  const foot = document.createElement('div');
  foot.className = 'c-mviewer__foot';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'c-mviewer__close';
  close.setAttribute('aria-label', strings.close || 'Close');
  close.append(icon('x', { size: 24 }));
  close.addEventListener('click', () => dismissOverlay(el));
  foot.append(close);
  el.append(foot);

  // swipe-to-dismiss (Damir: intuitive close, no hunting the ✕): vertical
  // drag EITHER direction — the image rides the finger and the viewer fades;
  // past the threshold on release = dismiss, under it = spring back.
  const DISMISS_PX = 80;
  let startY = 0;
  let dragY = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    startY = e.clientY;
    dragY = 0;
    stage.setPointerCapture(e.pointerId);
    img.style.transition = 'none'; // finger-follow must not lag
  });
  stage.addEventListener('pointermove', (e) => {
    if (dragY === null) return;
    dragY = e.clientY - startY;
    img.style.transform = 'translateY(' + dragY + 'px)';
    el.style.opacity = String(Math.max(0.4, 1 - Math.abs(dragY) / 320));
  });
  const endDrag = () => {
    if (dragY === null) return;
    const past = Math.abs(dragY) > DISMISS_PX;
    img.style.transition = ''; // spring-back transition returns (css)
    if (past) {
      dismissOverlay(el);
    } else {
      img.style.transform = '';
      el.style.opacity = '';
    }
    dragY = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  setOverlayOpts(el, { host, lightDismiss: true, escDismiss: true });
  openOverlay(el);
  return el;
}
