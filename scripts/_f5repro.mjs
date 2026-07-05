import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { JSDOM, VirtualConsole } = await import('jsdom');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const dom = new JSDOM(readFileSync(join(root,'src/demo/chats.html'),'utf8'), {
  runScripts:'dangerously', resources:'usable', pretendToBeVisual:true,
  url:'file://'+join(root,'src/demo/chats.html'), virtualConsole: new VirtualConsole(),
  beforeParse(w){ w.matchMedia = () => ({matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}}); }
});
await sleep(1200);
const W = dom.window, d = W.document;
let sendCtrl=null;
const add = W.Spixi.createAddContact({ onSendRequest:(a,ctrl)=>{ sendCtrl=ctrl; } });
d.body.append(add);
const input = add.querySelector('.c-contacts-add__input');
const btn = add.querySelector('.c-contacts__footer .c-button');
input.value = 'z'.repeat(24);
btn.click(); sendCtrl.done();
await sleep(1000);
const a = 'after1000ms disabled='+btn.disabled;
W.Spixi.setAddContactAddress(add,'brandnewaddress0000000000');
const b = 'postUnlatch disabled='+btn.disabled;
await sleep(700);
const c = 'afterRestoreTimer disabled='+btn.disabled;
console.log(JSON.stringify({a,b,c,label:btn.textContent}));
process.exit(0);
