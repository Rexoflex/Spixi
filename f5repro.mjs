import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.Event = window.Event;
global.SVGElement = window.SVGElement;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });

const { createAddContact, setAddContactAddress } = await import('./src/components/contacts-shell.js');

let sendCtrl = null;
const add = createAddContact({ onSendRequest: (a, ctrl) => { sendCtrl = ctrl; } });
document.body.append(add);
const input = add.querySelector('.c-contacts-add__input');
const btn = add.querySelector('.c-contacts__footer .c-button');

input.value = 'z'.repeat(24);
btn.click();
sendCtrl.done();
await new Promise(r => setTimeout(r, 1000));
console.log('after 1000ms: disabled =', btn.disabled, '| success =', btn.dataset.success);
setAddContactAddress(add, 'brandnewaddress0000000000');
console.log('right after unlatch (smoke asserts HERE): disabled =', btn.disabled);
await new Promise(r => setTimeout(r, 600));
console.log('after setSuccess 1400ms restore fires: disabled =', btn.disabled, '<-- REGRESSION if true');
console.log('label text =', JSON.stringify(btn.textContent));
