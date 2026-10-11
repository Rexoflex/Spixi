/* data.js — the fictional world the frames draw. Every name, address and amount is invented.
   Personal side (A Deck, C Stage): Maja and her people. Business side (B Office): Northwind Freight,
   the same world as the "Spixi for Business" concept renders (Adriatic Shipping, INV-2291, Reefer 17). */

var D = (function () {
  var me = { id: 'me', name: 'Maja Kos', ini: 'MK', g: 8 };

  /* g = the avatar disc pair (--disc-grad-1 … 11, tokens.css). kind: person | group | agent | bot */
  var people = {
    mira:   { name: 'Mira Novak',     ini: 'MN', g: 10, online: true,  addr: '1Rk9 3Fz7 Qe2W 8xLm 4bQ2' },
    falcon: { name: 'Falcon Crew',    ini: 'FC', g: 5,  kind: 'group', members: 6 },
    disp:   { name: 'Dispatch',       ini: 'D',  g: 8,  kind: 'agent', online: true },
    jonas:  { name: 'Jonas Berg',     ini: 'JB', g: 6,  addr: '13Hq 7PdN Vw3K s9Ta 2cX8' },
    comm:   { name: 'Ixian Community', ini: 'IC', g: 7, kind: 'bot' },
    lea:    { name: 'Lea Kranjc',     ini: 'LK', g: 2,  online: true },
    sven:   { name: 'Sven Holm',      ini: 'SH', g: 4 },
    tomaz:  { name: 'Tomaž Zupan',    ini: 'TZ', g: 1 },
    noor:   { name: 'Noor Haddad',    ini: 'NH', g: 9 },
    studio: { name: 'Studio Kvadrat', ini: 'SK', g: 3,  kind: 'group', members: 4 },
    kai:    { name: 'Kai Watanabe',   ini: 'KW', g: 11 },
    ines:   { name: 'Inês Duarte',    ini: 'ID', g: 6 },
    ola:    { name: 'Ola Nordmann',   ini: 'ON', g: 7 },
    tripjm: { name: 'Jonas & Mira · Porto', ini: 'JM', g: 2, kind: 'group', members: 3 },
    alex:   { name: 'Alex',  ini: 'A', g: 9 },
    lando:  { name: 'Lando', ini: 'L', g: 2 },
    rin:    { name: 'Rin',   ini: 'R', g: 4 }
  };

  /* The personal chat list. ex = excerpt, t = time, u = unread, st = own-message status */
  var chats = [
    { p: 'mira',   ex: 'Also — chess tonight?', t: '13:58', u: 2, pin: true },
    { p: 'falcon', ex: 'Alex: Deposit received — trip is locked in', t: '13:29', u: 3, pin: true },
    { p: 'disp',   ex: 'Route TR-44 is ready for your review', t: '12:58', u: 1, agent: true },
    { p: 'jonas',  ex: 'You: Thursday then. I send it now.', t: '11:20', st: 'read' },
    { p: 'comm',   ex: '#announcements · Desktop preview notes', t: '10:05', u: 12, muted: true },
    { p: 'lea',    ex: 'Payment request · 40 IXI', t: 'Yesterday', icon: 'wallet' },
    { p: 'sven',   ex: 'Photo', t: 'Yesterday', icon: 'photo' },
    { p: 'tomaz',  ex: 'Can you send the QR code again?', t: 'Fri' },
    { p: 'studio', ex: 'Noor: Final logo files are in', t: 'Thu', icon: 'file-text' },
    { p: 'noor',   ex: 'You: Thanks, that works for me', t: 'Wed', st: 'read' },
    { p: 'kai',    ex: 'Voice message · 0:42', t: 'Wed', icon: 'microphone' },
    { p: 'ines',   ex: 'Obrigada! See you in Porto', t: 'Tue' },
    { p: 'ola',    ex: 'You: Sent you the address', t: '6 Oct', st: 'delivered' },
    { p: 'tripjm', ex: 'Jonas: Flights booked ✈', t: '5 Oct' }
  ];

  /* Mira — the conversation used in A and C. k: in | out | file | req | app | day | paid */
  var miraThread = [
    { k: 'day', text: 'Yesterday' },
    { k: 'in', text: 'Did the agent reply about the flat?', t: '18:40' },
    { k: 'out', text: 'Not yet. I call them tomorrow morning.', t: '18:52', st: 'read' },
    { k: 'day', text: 'Today' },
    { k: 'in', text: 'Morning! I went through the lease with the agent.', t: '09:12', first: true },
    { k: 'in', text: 'Two changes on page 3: the deposit and the move-in date.', t: '09:12' },
    { k: 'file', dir: 'in', name: 'Lease draft v3.pdf', meta: '2.4 MB · PDF', t: '09:13' },
    { k: 'out', text: 'Perfect, I read it now.', t: '09:20', st: 'read', first: true },
    { k: 'out', text: 'Deposit looks right. I send my half today.', t: '09:31', st: 'read' },
    { k: 'req', dir: 'in', title: 'Payment request', amount: '120', note: 'Lisbon flat · your half of the deposit', t: '09:33' },
    { k: 'in', text: 'Also — chess tonight? 😄', t: '13:58', first: true }
  ];

  var falconThread = [
    { k: 'day', text: 'Today' },
    { k: 'in', who: 'alex', text: 'Crew, the cabin trip is ON.', t: '12:29', first: true },
    { k: 'in', who: 'alex', text: 'Six bunks, one hammock.', t: '12:30' },
    { k: 'out', text: 'Hammock is mine, calling it now.', t: '12:32', st: 'read', first: true },
    { k: 'in', who: 'lando', text: 'I have a cape for every weather condition.', t: '12:41', first: true },
    { k: 'in', who: 'rin', text: 'Who brings the drone?', t: '13:02', first: true },
    { k: 'in', who: 'alex', text: 'Deposit received — trip is locked in 🎉', t: '13:29', first: true }
  ];

  var jonasThread = [
    { k: 'day', text: 'Today' },
    { k: 'in', text: 'Got the tickets for Thursday 🎫', t: '11:02', first: true },
    { k: 'in', text: 'Row 12, right in the middle.', t: '11:02' },
    { k: 'out', text: 'Amazing, thank you!', t: '11:15', st: 'read', first: true },
    { k: 'in', text: 'Your part is 25 IXI, no rush.', t: '11:18', first: true },
    { k: 'out', text: 'Thursday then. I send it now.', t: '11:20', st: 'read', first: true }
  ];

  /* Maja's personal wallet (A Deck · C Stage · the "not a mobile port" wallet) */
  var wallet = {
    bal: '1,284.52', fiat: '$1,586.39', delta: '+214.52', deltaPct: '+20.0 %',
    /* 31 daily closing balances, 11 Sep → 11 Oct (drawn to scale by K.chart). From 27 Sep on they follow the rows below;
       before that, four older payments (−424.88) that the table shows only when scrolled. In = 1,208.00, Out = 993.48. */
    series: [1070, 1070, 1010, 1010, 1010, 905, 905, 905, 905, 765.12, 765.12, 765.12, 765.12, 645.12, 645.12, 645.12, 645.12,
      623.12, 623.12, 1223.12, 1159.12, 1159.12, 1122.92, 1122.92, 1522.92, 1477.92, 1477.92, 1495.92, 1185.92, 1249.52, 1284.52],
    rows: [
      { d: 'Today 11:02', who: 'lea', note: 'Dinner split', amt: '+40.00', st: 'confirmed', dir: 'in' },
      { d: 'Today 08:15', who: 'falcon', note: 'Tip · Alex', amt: '-5.00', st: 'confirmed', dir: 'out' },
      { d: 'Yesterday 19:30', who: 'mira', note: 'Split · cabin trip share', app: 'Split', amt: '-86.40', st: 'confirmed', dir: 'out' },
      { d: 'Yesterday 12:10', who: 'comm', note: 'Contributor reward', amt: '+150.00', st: 'confirmed', dir: 'in' },
      { d: '9 Oct', who: 'sven', note: 'Camera lens', amt: '-310.00', st: 'confirmed', dir: 'out' },
      { d: '8 Oct', who: 'kai', note: 'Concert refund', amt: '+18.00', st: 'confirmed', dir: 'in' },
      { d: '6 Oct', who: 'tomaz', note: 'Bike repair', amt: '-45.00', st: 'confirmed', dir: 'out' },
      { d: '5 Oct', who: 'noor', note: 'Logo work', amt: '+400.00', st: 'confirmed', dir: 'in' },
      { d: '3 Oct', who: 'mira', note: 'Groceries', amt: '-36.20', st: 'confirmed', dir: 'out' },
      { d: '1 Oct', who: 'ines', note: 'Porto hostel', amt: '-64.00', st: 'confirmed', dir: 'out' },
      { d: '30 Sep', who: 'studio', note: 'Project payment', amt: '+600.00', st: 'confirmed', dir: 'in' },
      { d: '28 Sep', who: 'jonas', note: 'Train tickets', amt: '-22.00', st: 'confirmed', dir: 'out' }
    ],
    requests: [
      { who: 'mira', note: 'Lisbon flat · your half of the deposit', amt: '120.00', dir: 'in', when: 'Today 09:33' },
      { who: 'tomaz', note: 'Bike parts', amt: '30.00', dir: 'out', when: 'Fri' }
    ]
  };

  /* Files shared across chats (A inspector, A/C search) */
  var files = [
    { name: 'Lease draft v3.pdf', type: 'PDF', size: '2.4 MB', from: 'mira', chat: 'mira', when: 'Today 09:13' },
    { name: 'Lisbon-flat-floorplan.png', type: 'PNG', size: '860 KB', from: 'mira', chat: 'mira', when: 'Mon' },
    { name: 'Lease draft v2.pdf', type: 'PDF', size: '2.3 MB', from: 'mira', chat: 'mira', when: '28 Sep' },
    { name: 'Shared-budget.xlsx', type: 'XLSX', size: '48 KB', from: 'me', chat: 'mira', when: '2 Oct' },
    { name: 'Lease draft v1.pdf', type: 'PDF', size: '2.1 MB', from: 'mira', chat: 'mira', when: '21 Sep' },
    { name: 'Cabin-route.gpx', type: 'GPX', size: '312 KB', from: 'alex', chat: 'falcon', when: 'Today 12:31' },
    { name: 'Lease-checklist.md', type: 'MD', size: '4 KB', from: 'noor', chat: 'studio', when: 'Thu' },
    { name: 'Logo-final.svg', type: 'SVG', size: '22 KB', from: 'noor', chat: 'studio', when: 'Thu' },
    { name: 'Concert-tickets.pdf', type: 'PDF', size: '180 KB', from: 'me', chat: 'jonas', when: 'Today 11:16' }
  ];

  /* ------------------------------------------------------------------ business (B Office) */
  var team = {
    maja:  { name: 'Maja Kos',     ini: 'MK', g: 8 },
    luka:  { name: 'Luka Horvat',  ini: 'LH', g: 5 },
    priya: { name: 'Priya Shah',   ini: 'PS', g: 2 },
    tea:   { name: 'Tea Vidmar',   ini: 'TV', g: 10 }
  };
  var cust = {
    ana:   { name: 'Ana Ruiz',      ini: 'AR', g: 11, org: 'Adriatic Shipping', online: true, addr: '1Adr 9kQe 33Wm Tz7P 0vNc' },
    marco: { name: 'Marco Bianchi', ini: 'MB', g: 3,  org: 'Port of Koper' },
    hans:  { name: 'Hans Gruber',   ini: 'HG', g: 7,  org: 'Alpen Logistik' },
    sofia: { name: 'Sofia Rossi',   ini: 'SR', g: 9,  org: 'Milano Freddo', online: true },
    erik:  { name: 'Erik Lund',     ini: 'EL', g: 6,  org: 'Nordhavn Cargo' },
    davor: { name: 'Davor Petek',   ini: 'DP', g: 4,  org: 'Adriatic Shipping' },
    lin:   { name: 'Lin Zhou',      ini: 'LZ', g: 1,  org: 'Rotterdam Dock 4' },
    ruth:  { name: 'Ruth Adler',    ini: 'RA', g: 10, org: 'Graz Depot' },
    oskar: { name: 'Oskar Nyberg',  ini: 'ON', g: 5,  org: 'Nordhavn Cargo' },
    mila:  { name: 'Mila Jovanović', ini: 'MJ', g: 2, org: 'Port of Koper' },
    disp:  { name: 'Dispatch', ini: 'D', g: 8, kind: 'agent', org: 'Agent · ops-server-2', online: true },
    ledg:  { name: 'Ledger',   ini: 'L', g: 4, kind: 'agent', org: 'Agent · ops-server-2', online: true }
  };
  /* inbox rows: a = assignee, w = waiting, lab = label, s = state (new|open|waiting|done) */
  var inbox = [
    { c: 'ana',   ex: 'Invoice attached for September.', t: '13:41', u: 2, a: 'maja', w: '12m', lab: 'Invoice', s: 'open' },
    { c: 'sofia', ex: 'Can we move the Milan pickup to 07:00?', t: '13:30', u: 1, a: null, w: '23m', lab: 'Schedule', s: 'new' },
    { c: 'disp',  ex: 'Proposal: reroute TR-44 via Tarvisio', t: '13:18', u: 1, a: 'maja', w: '35m', lab: 'Approval', s: 'open', agent: true },
    { c: 'marco', ex: 'Gate B-2 pass for 14:00–16:00 is ready', t: '12:55', a: 'luka', w: '58m', lab: 'Access', s: 'open' },
    { c: 'hans',  ex: 'You: The truck left Graz at 11:10', t: '12:20', a: 'maja', lab: 'Delivery', s: 'waiting', st: 'read' },
    { c: 'erik',  ex: 'Bill of lading NHC-5531 attached', t: '11:47', a: 'priya', w: '2h', lab: 'Documents', s: 'open' },
    { c: 'lin',   ex: 'Crane C3 is back in service', t: '11:02', a: 'tea', lab: 'Ops', s: 'waiting' },
    { c: 'ruth',  ex: 'Thanks, received both pallets', t: '10:15', a: 'luka', lab: 'Delivery', s: 'done', st: 'read' },
    { c: 'ledg',  ex: 'Weekly summary posted to #finance', t: '09:00', a: null, lab: 'Report', s: 'done', agent: true },
    { c: 'davor', ex: 'Customs papers for TR-51?', t: 'Yesterday', a: 'priya', lab: 'Documents', s: 'waiting' },
    { c: 'oskar', ex: 'You: Confirmed for Monday', t: 'Yesterday', a: 'maja', lab: 'Schedule', s: 'done', st: 'read' },
    { c: 'mila',  ex: 'New gate codes from 15 Oct', t: 'Fri', a: 'luka', lab: 'Access', s: 'done' }
  ];
  var anaThread = [
    { k: 'day', text: 'Today' },
    { k: 'in', text: 'Hi Maja, Reefer 17 shows 7.8 °C near Villach.', t: '13:02', first: true },
    { k: 'in', text: 'Can you confirm the defrost cycle and the new ETA?', t: '13:02' },
    { k: 'out', text: 'On it. Defrost runs now, new ETA 16:40.', t: '13:21', st: 'read', first: true },
    { k: 'file', dir: 'in', name: 'INV-2291-September.pdf', meta: '96 KB · PDF', t: '13:40' },
    { k: 'req', dir: 'in', title: 'Invoice INV-2291', amount: '12,500', note: 'Adriatic Shipping · September · due 15 Oct', t: '13:41' },
    { k: 'in', text: 'Invoice attached for September.', t: '13:41', first: true }
  ];
  /* ledger rows */
  var ledger = [
    { d: '11 Oct 13:52', who: 'Port of Koper',     ref: 'Gate fees · Sep',   amt: '-2,140.00', fee: '0.02', bal: '182,450.25', st: 'confirming', dir: 'out' },
    { d: '11 Oct 10:04', who: 'Milano Freddo',     ref: 'INV-NW-0912',       amt: '+18,400.00', fee: '',     bal: '184,590.27', st: 'confirmed', dir: 'in' },
    { d: '10 Oct 16:20', who: 'Alpen Logistik',    ref: 'Fuel share TR-44',  amt: '-860.50',   fee: '0.01', bal: '166,190.27', st: 'confirmed', dir: 'out' },
    { d: '10 Oct 09:12', who: 'Nordhavn Cargo',    ref: 'INV-NW-0907',       amt: '+9,750.00', fee: '',     bal: '167,050.78', st: 'confirmed', dir: 'in' },
    { d: '9 Oct 15:45',  who: 'Graz Depot',        ref: 'Storage Q4 deposit', amt: '-4,000.00', fee: '0.02', bal: '157,300.78', st: 'confirmed', dir: 'out' },
    { d: '9 Oct 08:30',  who: 'Rotterdam Dock 4',  ref: 'Crane C3 hire',     amt: '-1,280.00', fee: '0.01', bal: '161,300.80', st: 'confirmed', dir: 'out' },
    { d: '8 Oct 17:02',  who: 'Adriatic Shipping', ref: 'INV-2270 · Aug',    amt: '-11,900.00', fee: '0.02', bal: '162,580.81', st: 'confirmed', dir: 'out' },
    { d: '8 Oct 11:40',  who: 'Port of Koper',     ref: 'Refund · double fee', amt: '+320.00', fee: '',     bal: '174,480.83', st: 'confirmed', dir: 'in' },
    { d: '7 Oct 14:18',  who: 'Milano Freddo',     ref: 'INV-NW-0899',       amt: '+21,600.00', fee: '',    bal: '174,160.83', st: 'confirmed', dir: 'in' },
    { d: '6 Oct 10:05',  who: 'Alpen Logistik',    ref: 'Toll pass · Oct',   amt: '-640.00',   fee: '0.01', bal: '152,560.83', st: 'confirmed', dir: 'out' },
    { d: '5 Oct 09:21',  who: 'Nordhavn Cargo',    ref: 'INV-NW-0890',       amt: '+7,300.00', fee: '',     bal: '153,200.84', st: 'confirmed', dir: 'in' },
    { d: '4 Oct 16:44',  who: 'Graz Depot',        ref: 'Pallet return',     amt: '+410.00',   fee: '',     bal: '145,900.84', st: 'confirmed', dir: 'in' },
    { d: '3 Oct 12:00',  who: 'Payroll wallet',    ref: 'Transfer · Oct',    amt: '-24,000.00', fee: '0.03', bal: '145,490.84', st: 'confirmed', dir: 'out' },
    { d: '2 Oct 08:15',  who: 'Port of Koper',     ref: 'INV-NW-0881',       amt: '+12,250.00', fee: '',    bal: '169,490.87', st: 'confirmed', dir: 'in' },
    { d: '1 Oct 18:30',  who: 'Rotterdam Dock 4',  ref: 'Berth Oct',         amt: '-3,100.00', fee: '0.02', bal: '157,240.87', st: 'confirmed', dir: 'out' }
  ];
  var requests = [
    { who: 'Adriatic Shipping', ref: 'INV-2291 · September', amt: '12,500.00', due: '15 Oct', from: 'Ana Ruiz', st: 'open' },
    { who: 'Port of Koper', ref: 'Gate B-2 pass · Oct', amt: '180.00', due: '14 Oct', from: 'Marco Bianchi', st: 'open' },
    { who: 'Graz Depot', ref: 'Storage · extra pallets', amt: '960.00', due: '20 Oct', from: 'Ruth Adler', st: 'open' }
  ];
  var bizFiles = [
    { name: 'BoL-NHC-5531.pdf', type: 'PDF', from: 'erik', org: 'Nordhavn Cargo', when: 'Today 11:47', size: '310 KB' },
    { name: 'INV-2291-September.pdf', type: 'PDF', from: 'ana', org: 'Adriatic Shipping', when: 'Today 13:40', size: '96 KB' },
    { name: 'Reefer17-temp-log.csv', type: 'CSV', from: 'disp', org: 'Agent · Dispatch', when: 'Today 13:05', size: '42 KB' },
    { name: 'Gate-B2-pass.pdf', type: 'PDF', from: 'marco', org: 'Port of Koper', when: 'Today 12:55', size: '64 KB' },
    { name: 'BoL-ADS-4410.pdf', type: 'PDF', from: 'ana', org: 'Adriatic Shipping', when: '9 Oct', size: '288 KB' },
    { name: 'Customs-TR-51.pdf', type: 'PDF', from: 'davor', org: 'Adriatic Shipping', when: 'Yesterday', size: '1.1 MB' },
    { name: 'BoL-ADS-4388.pdf', type: 'PDF', from: 'davor', org: 'Adriatic Shipping', when: '2 Oct', size: '276 KB' },
    { name: 'Crane-C3-service.pdf', type: 'PDF', from: 'lin', org: 'Rotterdam Dock 4', when: 'Today 11:02', size: '540 KB' },
    { name: 'Pallet-receipt.jpg', type: 'JPG', from: 'ruth', org: 'Graz Depot', when: 'Today 10:15', size: '1.8 MB' },
    { name: 'Milan-pickup-plan.xlsx', type: 'XLSX', from: 'sofia', org: 'Milano Freddo', when: 'Today 13:30', size: '38 KB' }
  ];

  return { me: me, people: people, chats: chats, miraThread: miraThread, falconThread: falconThread,
    jonasThread: jonasThread, wallet: wallet, files: files, team: team, cust: cust, inbox: inbox, anaThread: anaThread,
    ledger: ledger, requests: requests, bizFiles: bizFiles };
})();
