/* BaanHub · แกนกลางของ mockup แบบพอร์ทัล (design-5-portal-*.html)
   ใช้ร่วมกันทั้ง 3 แบบ: ข้อมูลตัวอย่าง, ภาพประกอบ SVG, Dropdown (APG select-only combobox), router แบบ hash
   ข้อมูลทั้งหมดเป็นข้อมูลสมมติ — ภาพทุกภาพวาดด้วย SVG ของเราเอง */
(function () {
  'use strict';

  /* ---------- ข้อมูลอ้างอิง ---------- */
  var TYPES = [
    { id: 'condo', label: 'คอนโด', icon: 'condo' },
    { id: 'house', label: 'บ้านเดี่ยว', icon: 'house' },
    { id: 'townhouse', label: 'ทาวน์โฮม', icon: 'townhouse' },
    { id: 'twin', label: 'บ้านแฝด', icon: 'twin' },
    { id: 'land', label: 'ที่ดิน', icon: 'land' },
    { id: 'shophouse', label: 'อาคารพาณิชย์', icon: 'shophouse' },
    { id: 'apartment', label: 'อพาร์ตเมนต์', icon: 'apartment' },
    { id: 'office', label: 'สำนักงาน', icon: 'office' },
  ];
  var DEALS = [
    { id: 'buy', label: 'ซื้อ', deal: 'sale', market: '' },
    { id: 'rent', label: 'เช่า', deal: 'rent', market: '' },
    { id: 'new', label: 'โครงการใหม่', deal: 'sale', market: 'new' },
    { id: 'resale', label: 'มือสอง', deal: 'sale', market: 'resale' },
  ];
  var PROVINCES = [
    { id: 'bkk', label: 'กรุงเทพมหานคร', hint: 'ประกาศ 18,420 รายการ' },
    { id: 'non', label: 'นนทบุรี', hint: 'ประกาศ 4,105 รายการ' },
    { id: 'pth', label: 'ปทุมธานี', hint: 'ประกาศ 2,870 รายการ' },
    { id: 'spk', label: 'สมุทรปราการ', hint: 'ประกาศ 3,240 รายการ' },
    { id: 'cnx', label: 'เชียงใหม่', hint: 'ประกาศ 2,315 รายการ' },
    { id: 'cbi', label: 'ชลบุรี', hint: 'ประกาศ 3,960 รายการ' },
    { id: 'hkt', label: 'ภูเก็ต', hint: 'ประกาศ 1,780 รายการ' },
    { id: 'kkn', label: 'ขอนแก่น', hint: 'ประกาศ 860 รายการ' },
  ];
  var PRICE = {
    sale: [
      { id: 'p1', label: 'ไม่เกิน 2 ล้าน', min: 0, max: 2e6 },
      { id: 'p2', label: '2 – 5 ล้าน', min: 2e6, max: 5e6 },
      { id: 'p3', label: '5 – 10 ล้าน', min: 5e6, max: 1e7 },
      { id: 'p4', label: '10 ล้านขึ้นไป', min: 1e7, max: Infinity },
    ],
    rent: [
      { id: 'p1', label: 'ไม่เกิน ฿10,000/เดือน', min: 0, max: 1e4 },
      { id: 'p2', label: '฿10,000 – 20,000', min: 1e4, max: 2e4 },
      { id: 'p3', label: '฿20,000 – 40,000', min: 2e4, max: 4e4 },
      { id: 'p4', label: '฿40,000 ขึ้นไป', min: 4e4, max: Infinity },
    ],
  };
  var BEDS = [
    { id: '0', label: 'สตูดิโอขึ้นไป' }, { id: '1', label: '1 ห้องนอนขึ้นไป' },
    { id: '2', label: '2 ห้องนอนขึ้นไป' }, { id: '3', label: '3 ห้องนอนขึ้นไป' }, { id: '4', label: '4 ห้องนอนขึ้นไป' },
  ];
  var SORTS = [
    { id: 'latest', label: 'ล่าสุด' }, { id: 'price-asc', label: 'ราคาต่ำ → สูง' },
    { id: 'price-desc', label: 'ราคาสูง → ต่ำ' }, { id: 'area', label: 'พื้นที่มากสุด' },
  ];
  var AREAS = [
    { id: 'ari', label: 'อารีย์', prov: 'bkk', line: 'BTS', count: 1240, palette: 'day', kind: 'condo' },
    { id: 'thonglor', label: 'ทองหล่อ – เอกมัย', prov: 'bkk', line: 'BTS', count: 2105, palette: 'dusk', kind: 'condo' },
    { id: 'rama9', label: 'พระราม 9 – รัชดา', prov: 'bkk', line: 'MRT', count: 1876, palette: 'night', kind: 'condo' },
    { id: 'bangna', label: 'บางนา – ศรีนครินทร์', prov: 'spk', line: 'BTS', count: 1530, palette: 'mint', kind: 'townhouse' },
    { id: 'ratchaphruek', label: 'ราชพฤกษ์', prov: 'non', line: '', count: 980, palette: 'day', kind: 'house' },
    { id: 'nimman', label: 'นิมมานเหมินท์', prov: 'cnx', line: '', count: 640, palette: 'mint', kind: 'house' },
    { id: 'pattaya', label: 'พัทยา – จอมเทียน', prov: 'cbi', line: '', count: 2230, palette: 'sea', kind: 'condo' },
    { id: 'kathu', label: 'กะทู้ – ป่าตอง', prov: 'hkt', line: '', count: 720, palette: 'sea', kind: 'house' },
  ];
  var LINES = [
    { id: 'bts-sukhumvit', label: 'BTS สายสุขุมวิท', color: 'var(--line-bts)', stations: ['อารีย์', 'อโศก', 'ทองหล่อ', 'เอกมัย', 'อ่อนนุช', 'แบริ่ง'] },
    { id: 'bts-silom', label: 'BTS สายสีลม', color: 'var(--line-silom)', stations: ['สนามกีฬา', 'ช่องนนทรี', 'สุรศักดิ์', 'วงเวียนใหญ่'] },
    { id: 'mrt-blue', label: 'MRT สายสีน้ำเงิน', color: 'var(--line-mrt)', stations: ['พระราม 9', 'ห้วยขวาง', 'ลาดพร้าว', 'สามย่าน'] },
    { id: 'mrt-purple', label: 'MRT สายสีม่วง', color: 'var(--line-purple)', stations: ['บางกระสอ', 'แยกนนทบุรี 1', 'บางพลู'] },
    { id: 'yellow', label: 'สายสีเหลือง', color: 'var(--line-yellow)', stations: ['ศรีนครินทร์ 38', 'ศรีอุดม', 'ทิพวัล'] },
  ];

  var AGENTS = {
    a: { name: 'กฤษดา พรหมวงศ์', company: 'BaanHub Partner', initials: 'กฤ', verified: true, phone: '081-234-5678', listings: 42, reply: 'ตอบกลับภายใน 1 ชม.' },
    b: { name: 'ธนาภรณ์ ใจดี', company: 'ธนา โฮม เอเจนซี่', initials: 'ธน', verified: true, phone: '089-765-4321', listings: 28, reply: 'ตอบกลับภายใน 1 ชม.' },
    c: { name: 'มาลี ศรีสุข', company: 'มาลี เอสเตท', initials: 'มล', verified: false, phone: '086-555-0199', listings: 15, reply: 'ตอบกลับภายใน 3 ชม.' },
    d: { name: 'โครงการ ฝ่ายขาย', company: 'ผู้พัฒนาโครงการ', initials: 'ขย', verified: true, phone: '02-123-4567', listings: 6, reply: 'ตอบกลับภายใน 30 นาที' },
  };

  var L = [
    { slug: 'condo-ari-skyview', title: 'คอนโดวิวเมือง ใกล้ BTS อารีย์', type: 'condo', deal: 'sale', market: 'resale', prov: 'bkk', area: 'ari', loc: 'พญาไท, กรุงเทพฯ', transit: 'BTS อารีย์ 350 ม.', price: 4590000, beds: 1, baths: 1, size: 38, land: null, floor: '18', days: 1, agent: 'a', palette: 'day', photos: 14, badges: ['hot'], map: [38, 30], features: ['เฟอร์นิเจอร์ครบ', 'สระว่ายน้ำ', 'ฟิตเนส', 'ที่จอดรถ', 'รปภ. 24 ชม.'], desc: 'ห้องมุมชั้นสูง วิวเมืองไม่บล็อก ตกแต่งพร้อมเข้าอยู่ เดินถึงสถานีรถไฟฟ้า ใกล้ตลาดและคาเฟ่ย่านอารีย์' },
    { slug: 'townhouse-ari-renovated', title: 'ทาวน์โฮมรีโนเวท 3 ชั้น ซอยอารีย์', type: 'townhouse', deal: 'sale', market: 'resale', prov: 'bkk', area: 'ari', loc: 'พญาไท, กรุงเทพฯ', transit: 'BTS อารีย์ 900 ม.', price: 7950000, beds: 3, baths: 3, size: 165, land: 22, floor: '3 ชั้น', days: 3, agent: 'b', palette: 'dusk', photos: 22, badges: ['verified'], map: [32, 38], features: ['รีโนเวทใหม่', 'ห้องทำงาน', 'จอดรถ 1 คัน', 'ใกล้ตลาด'], desc: 'ทาวน์โฮม 3 ชั้นรีโนเวทใหม่ทั้งหลัง มีห้องทำงานแยกชั้น 3 เดินถึงตลาดและร้านอาหาร' },
    { slug: 'the-line-rama9', title: 'The Verve พระราม 9 — โครงการใหม่ติด MRT', type: 'condo', deal: 'sale', market: 'new', prov: 'bkk', area: 'rama9', loc: 'ห้วยขวาง, กรุงเทพฯ', transit: 'MRT พระราม 9 200 ม.', price: 2890000, priceFrom: true, beds: 1, baths: 1, size: 28, land: null, floor: '45 ชั้น', days: 0, agent: 'd', palette: 'night', photos: 30, badges: ['new', 'promo'], project: { name: 'The Verve พระราม 9', dev: 'สมมติ ดีเวลลอปเมนท์', units: 612, done: 'พร้อมอยู่ ไตรมาส 2/2570', promo: 'ฟรีค่าโอน + เฟอร์นิเจอร์' }, map: [62, 44], features: ['Sky pool ชั้น 45', 'Co-working', 'EV charger', 'ห้องพัสดุอัจฉริยะ'], desc: 'คอนโด high-rise ใจกลางย่านธุรกิจใหม่ ห้องเพดานสูง 2.7 ม. ส่วนกลางกว่า 2,000 ตร.ม.' },
    { slug: 'condo-thonglor-pet', title: 'คอนโดเลี้ยงสัตว์ได้ ทองหล่อ', type: 'condo', deal: 'rent', market: 'resale', prov: 'bkk', area: 'thonglor', loc: 'วัฒนา, กรุงเทพฯ', transit: 'BTS ทองหล่อ 450 ม.', price: 32000, beds: 2, baths: 2, size: 62, land: null, floor: '12', days: 2, agent: 'a', palette: 'dusk', photos: 16, badges: ['pet'], map: [70, 58], features: ['เลี้ยงสัตว์ได้', 'ลานวิ่งสุนัข', 'เฟอร์นิเจอร์ครบ', 'เครื่องซักผ้า'], desc: 'คอนโด pet-friendly มีลานวิ่งสุนัขบนดาดฟ้า ห้องมุมแสงดี สัญญาขั้นต่ำ 1 ปี' },
    { slug: 'house-garden-ratchaphruek', title: 'บ้านเดี่ยวมีสวน ราชพฤกษ์', type: 'house', deal: 'sale', market: 'resale', prov: 'non', area: 'ratchaphruek', loc: 'บางรักน้อย, นนทบุรี', transit: 'MRT สายสีม่วง บางรักน้อย 2.1 กม.', price: 7900000, beds: 4, baths: 3, size: 180, land: 62, floor: '2 ชั้น', days: 5, agent: 'b', palette: 'day', photos: 25, badges: ['verified'], map: [14, 22], features: ['สวนหน้าบ้าน', 'จอดรถ 2 คัน', 'ใกล้โรงเรียนนานาชาติ', 'ห้องแม่บ้าน'], desc: 'บ้านเดี่ยว 2 ชั้นในหมู่บ้านเงียบสงบ สวนหน้าบ้านกว้างพอให้เด็กและสัตว์เลี้ยงวิ่งเล่น' },
    { slug: 'villa-bangna-new', title: 'Bloom Ville บางนา — บ้านเดี่ยวโครงการใหม่', type: 'house', deal: 'sale', market: 'new', prov: 'spk', area: 'bangna', loc: 'บางพลี, สมุทรปราการ', transit: 'สายสีเหลือง ศรีนครินทร์ 38 1.5 กม.', price: 5390000, priceFrom: true, beds: 3, baths: 3, size: 152, land: 50, floor: '2 ชั้น', days: 1, agent: 'd', palette: 'mint', photos: 28, badges: ['new', 'promo'], project: { name: 'Bloom Ville บางนา', dev: 'สมมติ แลนด์', units: 186, done: 'พร้อมอยู่', promo: 'ส่วนลด ฿300,000' }, map: [82, 80], features: ['คลับเฮาส์', 'สวนส่วนกลาง 3 ไร่', 'Smart home', 'รปภ. 24 ชม.'], desc: 'บ้านเดี่ยวดีไซน์โมเดิร์น หน้ากว้าง 15 ม. ห้องนั่งเล่นเพดานสูงโปร่ง ใกล้เมกาบางนา' },
    { slug: 'twin-house-rangsit', title: 'บ้านแฝด ใกล้โรงเรียนและตลาด', type: 'twin', deal: 'sale', market: 'resale', prov: 'pth', area: '', loc: 'คลองหลวง, ปทุมธานี', transit: null, price: 3790000, beds: 3, baths: 2, size: 140, land: 38, floor: '2 ชั้น', days: 8, agent: 'c', palette: 'day', photos: 12, badges: [], map: [22, 8], features: ['พร้อมอยู่', 'ใกล้ตลาด', 'ใกล้โรงเรียน'], desc: 'บ้านแฝดพร้อมอยู่ ใกล้โรงเรียนและตลาดสด เดินทางเข้าเมืองสะดวกผ่านถนนพหลโยธิน' },
    { slug: 'wooden-house-nimman', title: 'บ้านไม้ร่วมสมัย ใกล้นิมมานฯ', type: 'house', deal: 'rent', market: 'resale', prov: 'cnx', area: 'nimman', loc: 'สุเทพ, เชียงใหม่', transit: null, price: 28000, beds: 2, baths: 2, size: 140, land: 80, floor: '2 ชั้น', days: 4, agent: 'c', palette: 'mint', photos: 18, badges: ['pet'], map: [8, 64], features: ['สวนร่มรื่น', 'มุมทำงาน', 'วิวดอย', 'เลี้ยงสัตว์ได้'], desc: 'บ้านไม้ 2 ชั้นในสวนร่มรื่น มีมุมทำงานติดหน้าต่างวิวดอยสุเทพ เหมาะกับคนทำงานรีโมต' },
    { slug: 'land-hang-dong', title: 'ที่ดินเปล่า วิวดอย หางดง 200 ตร.ว.', type: 'land', deal: 'sale', market: 'resale', prov: 'cnx', area: '', loc: 'หางดง, เชียงใหม่', transit: null, price: 3200000, beds: 0, baths: 0, size: 800, land: 200, floor: '-', days: 12, agent: 'c', palette: 'mint', photos: 8, badges: [], map: [6, 86], features: ['ถมแล้ว', 'น้ำไฟเข้าถึง', 'โฉนดพร้อมโอน'], desc: 'ที่ดินถมแล้ว วิวดอยรอบด้าน น้ำไฟเข้าถึง เหมาะสร้างบ้านพักหรือโฮมสเตย์' },
    { slug: 'shophouse-ladprao', title: 'อาคารพาณิชย์ 4 ชั้น ติดถนนลาดพร้าว', type: 'shophouse', deal: 'sale', market: 'resale', prov: 'bkk', area: '', loc: 'จตุจักร, กรุงเทพฯ', transit: 'MRT ลาดพร้าว 600 ม.', price: 12500000, beds: 3, baths: 4, size: 280, land: 18, floor: '4 ชั้น', days: 6, agent: 'b', palette: 'night', photos: 15, badges: ['verified'], map: [50, 18], features: ['ติดถนนใหญ่', 'ทำเลค้าขาย', 'ดาดฟ้า', 'จอดรถหน้าอาคาร'], desc: 'อาคารพาณิชย์ 4 ชั้นติดถนน หน้ากว้าง 4.5 ม. เหมาะทำออฟฟิศหรือร้านค้า คนผ่านทั้งวัน' },
    { slug: 'condo-pattaya-sea', title: 'คอนโดวิวทะเล จอมเทียน', type: 'condo', deal: 'rent', market: 'resale', prov: 'cbi', area: 'pattaya', loc: 'บางละมุง, ชลบุรี', transit: null, price: 18000, beds: 1, baths: 1, size: 42, land: null, floor: '21', days: 2, agent: 'a', palette: 'sea', photos: 20, badges: ['hot'], map: [90, 92], features: ['วิวทะเล', 'สระ Infinity', 'ใกล้ชายหาด 200 ม.'], desc: 'ห้องวิวทะเลเต็มบาน ระเบียงกว้าง เดินถึงชายหาดจอมเทียน เช่ารายเดือนหรือรายปี' },
    { slug: 'apartment-silom', title: 'อพาร์ตเมนต์ทั้งตึก ใกล้ BTS ช่องนนทรี', type: 'apartment', deal: 'sale', market: 'resale', prov: 'bkk', area: '', loc: 'บางรัก, กรุงเทพฯ', transit: 'BTS ช่องนนทรี 700 ม.', price: 48000000, beds: 24, baths: 24, size: 1200, land: 80, floor: '6 ชั้น', days: 9, agent: 'a', palette: 'day', photos: 19, badges: ['verified'], map: [48, 70], features: ['ผู้เช่าเต็ม 92%', 'ลิฟต์', 'รายได้ ฿380,000/เดือน'], desc: 'อพาร์ตเมนต์ 24 ห้อง ผู้เช่าเกือบเต็ม รายได้สม่ำเสมอ เหมาะกับนักลงทุนสายปล่อยเช่า' },
  ];

  /* ---------- ตัวช่วย ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function baht(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }
  function short(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, '') + ' ล้าน';
    return n.toLocaleString('en-US');
  }
  function priceText(h) { return (h.priceFrom ? 'เริ่ม ' : '') + baht(h.price) + (h.deal === 'rent' ? '/เดือน' : ''); }
  function priceShort(h) { return h.deal === 'rent' ? '฿' + (h.price / 1000).toFixed(h.price % 1000 ? 1 : 0) + 'K' : '฿' + short(h.price).replace(' ล้าน', 'M'); }
  function typeLabel(id) { var t = TYPES.find(function (x) { return x.id === id; }); return t ? t.label : ''; }
  function provLabel(id) { var p = PROVINCES.find(function (x) { return x.id === id; }); return p ? p.label : ''; }
  function postedText(d) { return d === 0 ? 'ลงวันนี้' : d === 1 ? 'เมื่อวาน' : d + ' วันที่แล้ว'; }
  function perSqm(h) { return h.deal === 'sale' && h.size ? baht(h.price / h.size) + '/ตร.ม.' : ''; }
  function find(slug) { return L.find(function (h) { return h.slug === slug; }); }

  var FAV_KEY = 'baanhub-portal-fav';
  var fav = {};
  try { fav = JSON.parse(localStorage.getItem(FAV_KEY) || '{}') || {}; } catch (e) { fav = {}; }
  function isFav(slug) { return !!fav[slug]; }
  function toggleFav(slug) {
    if (fav[slug]) delete fav[slug]; else fav[slug] = 1;
    try { localStorage.setItem(FAV_KEY, JSON.stringify(fav)); } catch (e) { /* ไม่มี storage ก็ใช้ได้ */ }
    return !!fav[slug];
  }
  function favCount() { return Object.keys(fav).length; }

  /* ---------- ไอคอน (เส้น 24px) ---------- */
  var ICON = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7.1 4c2 0 3.4 1.1 4.9 2.9C13.5 5.1 14.9 4 16.9 4c3.5 0 5.7 3.4 4.4 6.8C19.5 15.4 12 20 12 20z"/>',
    bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 3.4-1.4M7 19l-1 2M17 19l1 2"/>',
    area: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    land: '<path d="M3 20h18M5 20l3-9 4 4 3-6 4 11"/>',
    train: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 11h12M9 20l-2 2M15 20l2 2M9 16l-1 4M15 16l1 4"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    building: '<path d="M4 21V5l8-2v18M12 8l8 2v11M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M2 21h20"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    line: '<path d="M4 11c0-4 3.6-7 8-7s8 3 8 7-3.6 7-8 7c-.8 0-1.6-.1-2.3-.3L6 19.5l.8-3.1C5.1 15 4 13.1 4 11z"/>',
    condo: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M9.5 7h1M13.5 7h1M9.5 11h1M13.5 11h1M9.5 15h1M13.5 15h1M10.5 21v-3h3v3"/>',
    house: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    townhouse: '<path d="M2 20V9l5-4 5 4v11M12 20V9l5-4 5 4v11M2 20h20M5.5 13h3M15.5 13h3"/>',
    twin: '<path d="M2 20V10l6-5 4 3.3L16 5l6 5v10M12 8.3V20M2 20h20M5 14h3M16 14h3"/>',
    shophouse: '<path d="M4 21V4h16v17M4 9h16M4 14h16M8 21v-4h3v4M14 17h3"/>',
    apartment: '<path d="M3 21V7l9-4 9 4v14M3 21h18M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2M15 14h2M10 21v-3h4v3"/>',
    office: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h8M8 11h8M8 15h8"/>',
  };
  function icon(name, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[name] || '') + '</svg>'; }

  /* ---------- ภาพประกอบทรัพย์ (SVG ของเราเอง) ---------- */
  var PAL = {
    day:   { s1: '#9CC5FF', s2: '#E8F1FF', sun: '#FFD66B', b1: '#FFFFFF', b2: '#D6E2F5', b3: '#AFC3E3', win: '#7FA3D6', lit: '#FFD66B', g: '#9BC58A', roof: '#2E5AAC', acc: '#1A56DB', leaf: '#4E9A5B', trunk: '#6B4A33' },
    dusk:  { s1: '#F6B38C', s2: '#FDE6D2', sun: '#FFF3DA', b1: '#FFF8F0', b2: '#EBD7C4', b3: '#D3B79F', win: '#C29C7C', lit: '#FFD27A', g: '#B9B07E', roof: '#B5532F', acc: '#E0662C', leaf: '#6E7D45', trunk: '#6B4A33' },
    night: { s1: '#1F2D5C', s2: '#3E5AA8', sun: '#F4F1D8', b1: '#2E3F78', b2: '#24346A', b3: '#1A2756', win: '#41579A', lit: '#FFCF5A', g: '#1E2A52', roof: '#14204A', acc: '#FFB020', leaf: '#2E5A4E', trunk: '#3B2E2A' },
    mint:  { s1: '#A8E2D2', s2: '#EAF8F2', sun: '#FFE38A', b1: '#FFFFFF', b2: '#DCEFE7', b3: '#B4D8CA', win: '#79B4A1', lit: '#FFD66B', g: '#86BE79', roof: '#2F7D6B', acc: '#13866F', leaf: '#3F8A4E', trunk: '#6B4A33' },
    sea:   { s1: '#7FD0F0', s2: '#E6F7FD', sun: '#FFE08A', b1: '#FFFFFF', b2: '#D3ECF6', b3: '#A8D4E8', win: '#5FA9CF', lit: '#FFD66B', g: '#F1D9A6', roof: '#1C6E9C', acc: '#0E7FB8', leaf: '#3D9A6A', trunk: '#7A5A3A', sea: '#3BA7D6' },
  };
  var uid = 0;
  function art(type, palette, label, variant) {
    var p = PAL[palette] || PAL.day; var id = 'g' + (++uid); var v = variant || 0;
    var sunX = [318, 90, 250, 340][v % 4];
    var o = '<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label || '') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.s1 + '"/><stop offset="1" stop-color="' + p.s2 + '"/></linearGradient></defs>' +
      '<rect width="400" height="260" fill="url(#' + id + ')"/><circle cx="' + sunX + '" cy="58" r="24" fill="' + p.sun + '"/>' +
      '<g fill="' + p.b3 + '" opacity=".55"><rect x="0" y="150" width="40" height="80"/><rect x="44" y="128" width="30" height="102"/><rect x="330" y="140" width="34" height="90"/><rect x="368" y="120" width="32" height="110"/></g>';
    if (p.sea) o += '<rect y="200" width="400" height="30" fill="' + p.sea + '"/>';
    o += '<rect y="226" width="400" height="34" fill="' + p.g + '"/>';
    var tree = function (x, y, r) { return '<rect x="' + (x - 3) + '" y="' + y + '" width="6" height="' + (226 - y) + '" fill="' + p.trunk + '"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + p.leaf + '"/>'; };
    if (v % 2) o += '<g transform="translate(400 0) scale(-1 1)">';
    if (type === 'condo' || type === 'office') {
      o += '<rect x="78" y="112" width="58" height="114" rx="4" fill="' + p.b2 + '"/><rect x="150" y="34" width="104" height="192" rx="6" fill="' + p.b1 + '"/><rect x="268" y="92" width="66" height="134" rx="4" fill="' + p.b2 + '"/>';
      for (var i = 0; i < 40; i++) o += '<rect x="' + (162 + (i % 4) * 22) + '" y="' + (48 + Math.floor(i / 4) * 17) + '" width="14" height="9" rx="2" fill="' + ((i * 7 + v) % 6 === 0 ? p.lit : p.win) + '"/>';
      for (var j = 0; j < 12; j++) o += '<rect x="' + (88 + (j % 2) * 22) + '" y="' + (124 + Math.floor(j / 2) * 16) + '" width="14" height="8" rx="2" fill="' + p.win + '"/>';
      o += '<rect x="186" y="200" width="32" height="26" rx="3" fill="' + p.acc + '"/>' + tree(58, 196, 18) + tree(352, 200, 15);
    } else if (type === 'townhouse' || type === 'twin') {
      var n = type === 'twin' ? 2 : 3, w = type === 'twin' ? 120 : 88, x0 = type === 'twin' ? 80 : 68;
      for (var k = 0; k < n; k++) {
        var x = x0 + k * (w + 2);
        o += '<rect x="' + x + '" y="96" width="' + w + '" height="130" fill="' + (k % 2 ? p.b2 : p.b1) + '"/><polygon points="' + (x - 4) + ',100 ' + (x + w / 2) + ',64 ' + (x + w + 4) + ',100" fill="' + p.roof + '"/>' +
          '<rect x="' + (x + 12) + '" y="112" width="' + (w / 2 - 18) + '" height="26" rx="4" fill="' + (k === 1 ? p.lit : p.win) + '"/><rect x="' + (x + w / 2 + 6) + '" y="112" width="' + (w / 2 - 18) + '" height="26" rx="4" fill="' + p.win + '"/>' +
          '<rect x="' + (x + 12) + '" y="156" width="' + (w / 2 - 18) + '" height="22" rx="4" fill="' + p.win + '"/><rect x="' + (x + w / 2 + 6) + '" y="182" width="24" height="44" rx="3" fill="' + p.acc + '"/>';
      }
      o += tree(46, 190, 20);
    } else if (type === 'land') {
      o += '<path d="M0 170 Q100 110 190 150 T400 130 V226 H0z" fill="' + p.b3 + '" opacity=".8"/><path d="M0 200 Q120 170 230 190 T400 180 V226 H0z" fill="' + p.leaf + '" opacity=".6"/>' +
        '<g stroke="' + p.acc + '" stroke-width="3"><line x1="90" y1="206" x2="90" y2="236"/><line x1="310" y1="206" x2="310" y2="236"/></g><path d="M90 212 H310" stroke="' + p.acc + '" stroke-width="2" stroke-dasharray="6 6"/>' +
        '<rect x="168" y="186" width="64" height="26" rx="4" fill="' + p.b1 + '"/><text x="200" y="204" font-size="13" font-family="sans-serif" text-anchor="middle" fill="' + p.roof + '">200 ตร.ว.</text>' + tree(40, 182, 18) + tree(366, 186, 16);
    } else if (type === 'shophouse' || type === 'apartment') {
      var cols = type === 'apartment' ? 1 : 3, ww = type === 'apartment' ? 190 : 80, xs = type === 'apartment' ? 105 : 78, fl = type === 'apartment' ? 6 : 4;
      for (var c = 0; c < cols; c++) {
        var xx = xs + c * (ww + 2), top = 226 - fl * 30;
        o += '<rect x="' + xx + '" y="' + top + '" width="' + ww + '" height="' + (fl * 30) + '" fill="' + (c % 2 ? p.b2 : p.b1) + '"/>';
        for (var f = 0; f < fl - 1; f++) for (var q = 0; q < (type === 'apartment' ? 6 : 2); q++) {
          var wx = xx + 10 + q * (type === 'apartment' ? 30 : 34);
          o += '<rect x="' + wx + '" y="' + (top + 8 + f * 30) + '" width="' + (type === 'apartment' ? 20 : 26) + '" height="16" rx="2" fill="' + ((f + q + c + v) % 5 === 0 ? p.lit : p.win) + '"/>';
        }
        o += '<rect x="' + (xx + 6) + '" y="200" width="' + (ww - 12) + '" height="26" fill="' + p.acc + '" opacity=".85"/><rect x="' + xx + '" y="' + (top - 6) + '" width="' + ww + '" height="8" fill="' + p.roof + '"/>';
      }
      o += tree(46, 196, 16);
    } else {
      o += tree(56, 162, 28) + tree(356, 184, 20) +
        '<rect x="112" y="122" width="186" height="104" fill="' + p.b1 + '"/><rect x="230" y="96" width="92" height="130" fill="' + p.b2 + '"/>' +
        '<polygon points="98,126 205,62 312,126" fill="' + p.roof + '"/><rect x="222" y="88" width="108" height="10" fill="' + p.roof + '"/>' +
        '<rect x="188" y="166" width="34" height="60" rx="3" fill="' + p.acc + '"/><rect x="130" y="144" width="40" height="30" rx="4" fill="' + p.lit + '"/>' +
        '<rect x="246" y="114" width="56" height="34" rx="4" fill="' + p.win + '"/><rect x="246" y="164" width="56" height="34" rx="4" fill="' + p.lit + '"/>' +
        '<rect x="96" y="222" width="220" height="6" fill="' + p.b3 + '"/>';
    }
    if (v % 2) o += '</g>';
    return o + '</svg>';
  }

  /* ภาพเส้นขอบฟ้าเมืองสำหรับ hero — tone: 'day' | 'dusk' | 'night' */
  function skyline(tone, label) {
    var t = {
      day:   { s1: '#2F6FE4', s2: '#9CC5FF', s3: '#E6F0FF', sun: '#FFE18A', far: '#7FA6E6', mid: '#4D7FD6', near: '#1F4FB0', win: '#A9C7FF', lit: '#FFE18A', river: '#5E92E8' },
      dusk:  { s1: '#3A3F8F', s2: '#E9877A', s3: '#FCD9B8', sun: '#FFF1C9', far: '#B47E8E', mid: '#7A5878', near: '#3D2E55', win: '#9C7C9A', lit: '#FFD27A', river: '#C0738A' },
      night: { s1: '#0B1638', s2: '#1C2E66', s3: '#34509A', sun: '#F4F1D8', far: '#25386F', mid: '#1A2A5A', near: '#0F1A40', win: '#2E4482', lit: '#FFC94D', river: '#22397A' },
    }[tone || 'day'];
    var id = 'sk' + (++uid), o = '<svg viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + esc(label || 'ภาพประกอบเส้นขอบฟ้าเมือง') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.s1 + '"/><stop offset=".6" stop-color="' + t.s2 + '"/><stop offset="1" stop-color="' + t.s3 + '"/></linearGradient></defs>' +
      '<rect width="1440" height="560" fill="url(#' + id + ')"/><circle cx="1130" cy="150" r="54" fill="' + t.sun + '" opacity=".9"/>';
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var layer = function (base, minH, maxH, wMin, wMax, fill, win) {
      var s = '', x = -10;
      while (x < 1450) {
        var w = wMin + rnd() * (wMax - wMin), h = minH + rnd() * (maxH - minH);
        s += '<rect x="' + x.toFixed(0) + '" y="' + (base - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (h + 40).toFixed(0) + '" fill="' + fill + '"/>';
        if (rnd() > .78) s += '<rect x="' + (x + w / 2 - 2).toFixed(0) + '" y="' + (base - h - 26).toFixed(0) + '" width="4" height="26" fill="' + fill + '"/>';
        if (win) for (var yy = base - h + 14; yy < base - 10; yy += 18) for (var xx = x + 8; xx < x + w - 10; xx += 14) if (rnd() > .55) s += '<rect x="' + xx.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="6" height="8" fill="' + (rnd() > .8 ? t.lit : t.win) + '"/>';
        x += w + 4 + rnd() * 10;
      }
      return s;
    };
    o += layer(470, 120, 300, 50, 90, t.far, false) + layer(500, 80, 230, 40, 80, t.mid, true) + layer(540, 40, 140, 60, 120, t.near, true);
    o += '<rect y="520" width="1440" height="40" fill="' + t.river + '"/><path d="M0 524 H1440" stroke="' + t.lit + '" stroke-opacity=".35" stroke-dasharray="40 30" stroke-width="2"/>';
    return o + '</svg>';
  }

  /* แผนที่ประกอบ (ไม่ใช่แผนที่จริง) — ใช้เป็นพื้นหลัง วาง pin เป็นปุ่ม HTML ทับ */
  function mapArt(label) {
    var o = '<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label || 'แผนที่ประกอบ') + '">' +
      '<rect width="600" height="600" fill="var(--map-bg)"/>' +
      '<path d="M-20 420 C120 380 160 480 300 440 S500 330 640 380 V460 C500 420 420 520 300 520 S100 470 -20 500z" fill="var(--map-water)"/>' +
      '<rect x="380" y="90" width="140" height="110" rx="18" fill="var(--map-park)"/><circle cx="130" cy="180" r="60" fill="var(--map-park)"/>' +
      '<g stroke="var(--map-road)" stroke-width="14" fill="none" stroke-linecap="round"><path d="M0 120 H600"/><path d="M0 300 C200 280 400 320 600 290"/><path d="M200 0 V600"/><path d="M450 0 C430 200 470 400 440 600"/></g>' +
      '<g stroke="var(--map-road2)" stroke-width="5" fill="none"><path d="M0 60 H600M0 210 H600M0 360 H600M0 560 H600M90 0 V600M320 0 V600M540 0 V600"/></g>' +
      '<path d="M40 40 L200 200 L320 300 L560 560" stroke="var(--line-bts)" stroke-width="6" fill="none" stroke-dasharray="1 0"/>' +
      '<path d="M600 140 C460 160 360 240 300 300 S120 420 0 380" stroke="var(--line-mrt)" stroke-width="6" fill="none"/>';
    [[200, 200], [320, 300], [460, 160]].forEach(function (s) { o += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="9" fill="#fff" stroke="var(--map-ink)" stroke-width="3"/>'; });
    return o + '</svg>';
  }

  /* ---------- Dropdown: select-only combobox ตาม WAI-ARIA APG (§15.5) ---------- */
  var openDD = null;
  function dropdown(el, opts) {
    // opts: { label, placeholder, options:[{id,label,hint,icon}], value, onChange, name }
    var id = 'dd' + (++uid), value = opts.value || '', active = -1, typed = '', typedAt = 0;
    el.classList.add('dd');
    el.innerHTML =
      (opts.label ? '<span class="dd-label" id="' + id + '-l">' + esc(opts.label) + '</span>' : '') +
      '<button type="button" class="dd-btn" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '-list" ' +
      (opts.label ? 'aria-labelledby="' + id + '-l ' + id + '-v"' : 'aria-label="' + esc(opts.aria || opts.placeholder || '') + '"') + '>' +
      '<span class="dd-v" id="' + id + '-v"></span>' + icon('chev', 'dd-chev') + '</button>' +
      '<div class="dd-pop" hidden><div class="dd-sheet-head"><strong>' + esc(opts.label || opts.aria || '') + '</strong></div>' +
      '<ul class="dd-list" role="listbox" id="' + id + '-list" tabindex="-1"' + (opts.label ? ' aria-labelledby="' + id + '-l"' : '') + '></ul></div>' +
      (opts.name ? '<input type="hidden" name="' + esc(opts.name) + '">' : '');
    var btn = $('.dd-btn', el), pop = $('.dd-pop', el), list = $('.dd-list', el), v = $('.dd-v', el), hidden = $('input[type=hidden]', el);
    var all = function () { return (opts.placeholder ? [{ id: '', label: opts.placeholder }] : []).concat(opts.options); };
    function draw() {
      var items = all();
      list.innerHTML = items.map(function (o, i) {
        return '<li role="option" id="' + id + '-o' + i + '" data-i="' + i + '" aria-selected="' + (o.id === value) + '" class="dd-opt' + (i === active ? ' is-active' : '') + '">' +
          (o.icon ? icon(o.icon, 'dd-ic') : '') + '<span class="dd-ot"><span>' + esc(o.label) + '</span>' + (o.hint ? '<small>' + esc(o.hint) + '</small>' : '') + '</span>' +
          (o.id === value ? icon('check', 'dd-tick') : '') + '</li>';
      }).join('');
      var cur = items.find(function (o) { return o.id === value; });
      v.textContent = cur ? cur.label : (opts.placeholder || '');
      el.classList.toggle('dd-set', !!value);
      if (hidden) hidden.value = value;
      btn.setAttribute('aria-activedescendant', active >= 0 && !pop.hidden ? id + '-o' + active : '');
      var a = list.children[active]; if (a && !pop.hidden) a.scrollIntoView({ block: 'nearest' });
    }
    function open() {
      if (openDD && openDD !== api) openDD.close();
      var items = all(); active = Math.max(0, items.findIndex(function (o) { return o.id === value; }));
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); el.classList.add('dd-open'); openDD = api;
      document.documentElement.classList.toggle('dd-sheet-open', window.matchMedia('(max-width: 767.98px)').matches);
      draw();
    }
    function close(focus) {
      pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); el.classList.remove('dd-open');
      if (openDD === api) openDD = null; document.documentElement.classList.remove('dd-sheet-open'); draw();
      if (focus) btn.focus();
    }
    function pick(i) { var o = all()[i]; if (!o) return; var changed = o.id !== value; value = o.id; close(true); if (changed && opts.onChange) opts.onChange(value, o); }
    btn.addEventListener('click', function () { pop.hidden ? open() : close(); });
    btn.addEventListener('keydown', function (e) {
      var n = all().length, k = e.key;
      if (pop.hidden) {
        if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); open(); }
        return;
      }
      if (k === 'ArrowDown') { e.preventDefault(); active = Math.min(n - 1, active + 1); draw(); }
      else if (k === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
      else if (k === 'Home') { e.preventDefault(); active = 0; draw(); }
      else if (k === 'End') { e.preventDefault(); active = n - 1; draw(); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(active); }
      else if (k === 'Escape') { e.preventDefault(); close(true); }
      else if (k === 'Tab') { close(); }
      else if (k.length === 1) {
        var now = Date.now(); typed = now - typedAt > 700 ? k : typed + k; typedAt = now;
        var idx = all().findIndex(function (o) { return o.label.indexOf(typed) === 0; });
        if (idx >= 0) { active = idx; draw(); }
      }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var li = e.target.closest('li[data-i]'); if (li) pick(+li.dataset.i); });
    pop.addEventListener('click', function (e) { if (e.target === pop) close(true); });
    var api = {
      el: el, close: close, open: open,
      get: function () { return value; },
      set: function (val, silent) { value = val || ''; draw(); if (!silent && opts.onChange) opts.onChange(value); },
      setOptions: function (o) { opts.options = o; if (!o.some(function (x) { return x.id === value; })) value = ''; draw(); },
    };
    draw();
    return api;
  }
  document.addEventListener('click', function (e) { if (openDD && !openDD.el.contains(e.target)) openDD.close(); });

  /* ---------- การค้นหา ---------- */
  function filter(q) {
    var ranges = PRICE[q.deal === 'rent' ? 'rent' : 'sale'], r = ranges.find(function (x) { return x.id === q.price; });
    var kw = (q.q || '').trim().toLowerCase();
    var out = L.filter(function (h) {
      if (q.deal && h.deal !== q.deal) return false;
      if (q.market && h.market !== q.market) return false;
      if (q.type && h.type !== q.type) return false;
      if (q.prov && h.prov !== q.prov) return false;
      if (q.area && h.area !== q.area) return false;
      if (r && (h.price < r.min || h.price >= r.max)) return false;
      if (q.beds && h.beds < +q.beds) return false;
      if (q.pet && h.badges.indexOf('pet') < 0) return false;
      if (q.transit && !h.transit) return false;
      if (kw && (h.title + ' ' + h.loc + ' ' + (h.transit || '') + ' ' + (h.project ? h.project.name : '')).toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
    var s = q.sort || 'latest';
    out.sort(function (a, b) {
      return s === 'price-asc' ? a.price - b.price : s === 'price-desc' ? b.price - a.price : s === 'area' ? b.size - a.size : a.days - b.days;
    });
    return out;
  }

  /* ---------- router (hash) ---------- */
  var QKEYS = ['deal', 'market', 'type', 'prov', 'area', 'price', 'beds', 'q', 'sort', 'view', 'pet', 'transit'];
  function parse() {
    var h = location.hash.replace(/^#/, '') || '/', parts = h.split('?'), path = parts[0], q = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); if (QKEYS.indexOf(p[0]) >= 0) q[p[0]] = decodeURIComponent(p[1] || ''); });
    if (path.indexOf('/homes/') === 0) return { view: 'detail', slug: path.slice(7), q: q };
    if (path === '/search') return { view: 'search', q: q };
    return { view: 'home', q: q };
  }
  function href(path, q) {
    var s = QKEYS.filter(function (k) { return q && q[k]; }).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    return '#' + path + (s ? '?' + s : '');
  }
  function start(render) {
    var run = function () { if (openDD) openDD.close(); render(parse()); };
    window.addEventListener('hashchange', function () { run(); window.scrollTo(0, 0); });
    run();
  }

  /* ---------- ชิ้นส่วนที่ใช้ซ้ำ ---------- */
  function mortgage(price, downPct, years, rate) {
    var loan = price * (1 - downPct / 100), r = rate / 100 / 12, n = years * 12;
    return r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
  }
  function badgeText(b) { return { hot: 'ยอดนิยม', verified: 'ตรวจสอบแล้ว', new: 'โครงการใหม่', promo: 'มีโปรโมชัน', pet: 'เลี้ยงสัตว์ได้' }[b] || b; }
  function toast(msg) {
    var t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  /* ปุ่มหัวใจทุกที่ใช้ data-fav="slug" */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var on = toggleFav(b.dataset.fav);
    $$('[data-fav="' + b.dataset.fav + '"]').forEach(function (x) { x.setAttribute('aria-pressed', on); });
    $$('[data-fav-count]').forEach(function (x) { x.textContent = favCount(); x.hidden = !favCount(); });
    toast(on ? 'บันทึกไว้ในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว');
  });
  /* drawer เมนูมือถือ: ปุ่ม [data-drawer-open] / [data-drawer-close] กับ #drawer */
  document.addEventListener('click', function (e) {
    var d = $('#drawer'); if (!d) return;
    if (e.target.closest('[data-drawer-open]')) { d.hidden = false; document.documentElement.classList.add('lock'); var f = $('button, a', d); if (f) f.focus(); }
    else if (e.target.closest('[data-drawer-close]') || e.target === d || (e.target.closest('#drawer a[href]'))) { d.hidden = true; document.documentElement.classList.remove('lock'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return; var d = $('#drawer'); if (d && !d.hidden) { d.hidden = true; document.documentElement.classList.remove('lock'); }
    var s = $('.sheet:not([hidden])'); if (s && !openDD) { s.hidden = true; document.documentElement.classList.remove('lock'); }
  });

  /* ตรวจกติกา §15.2.7 จาก console: BH.audit() → scroll แนวนอน + ปุ่ม/ลิงก์ที่เล็กกว่า 44px */
  function audit() {
    var vw = document.documentElement.clientWidth;
    var wide = $$('body *').filter(function (e) {
      var r = e.getBoundingClientRect();
      if (!r.width || r.right <= vw + 1 || e.closest('svg,.dd-pop,[hidden]') || getComputedStyle(e).position === 'fixed') return false;
      for (var p = e.parentElement; p && p !== document.body; p = p.parentElement) { var ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') return false; }
      return true;
    }).slice(0, 6).map(function (e) { return e.tagName + '.' + e.className + ' →' + Math.round(e.getBoundingClientRect().right); });
    var small = $$('a[href],button,input:not([type=hidden]):not([type=checkbox]),[role=combobox]').filter(function (e) {
      var r = e.getBoundingClientRect();
      if (!r.width || e.closest('[hidden]') || e.classList.contains('sr') || e.closest('h3')) return false;
      return r.height < 43.5 || r.width < 43.5;
    }).slice(0, 8).map(function (e) { var r = e.getBoundingClientRect(); return (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 24)) + ' ' + Math.round(r.width) + '×' + Math.round(r.height); });
    var tiny = $$('input,textarea').filter(function (e) { return e.type !== 'checkbox' && e.type !== 'range' && e.type !== 'hidden' && parseFloat(getComputedStyle(e).fontSize) < 16; }).length;
    return { vw: vw, scrollW: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > vw, wide: wide, small: small, inputsUnder16px: tiny };
  }

  window.BH = {
    audit: audit,
    TYPES: TYPES, DEALS: DEALS, PROVINCES: PROVINCES, PRICE: PRICE, BEDS: BEDS, SORTS: SORTS, AREAS: AREAS, LINES: LINES, AGENTS: AGENTS, LISTINGS: L,
    $: $, $$: $$, esc: esc, baht: baht, short: short, priceText: priceText, priceShort: priceShort, typeLabel: typeLabel, provLabel: provLabel,
    postedText: postedText, perSqm: perSqm, find: find, isFav: isFav, favCount: favCount, icon: icon, art: art, skyline: skyline, mapArt: mapArt,
    dropdown: dropdown, filter: filter, parse: parse, href: href, start: start, mortgage: mortgage, badgeText: badgeText, toast: toast,
  };
})();
