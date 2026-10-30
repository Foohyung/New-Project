/*
 * TechForce Social — ต้นแบบ HTML ล้วน (ไม่มี build / server)
 * จัดการหลายแบรนด์ (workspace) แต่ละแบรนด์มีบัญชีโซเชียล กฎโพสต์อัตโนมัติ และโพสต์ของตัวเอง
 * ข้อมูลจำลองเก็บใน localStorage ของเบราว์เซอร์นี้ · ยังไม่เชื่อม API จริง (ไม่มีการโพสต์ออกไปจริง)
 */
(() => {
  'use strict';

  /* ---------------- ช่องทาง ---------------- */
  const PLATFORMS = {
    fb: { name: 'Facebook', short: 'f', limit: 63206, note: 'เพจ' },
    ig: { name: 'Instagram', short: 'IG', limit: 2200, note: 'ลิงก์ในแคปชันกดไม่ได้' },
    tt: { name: 'TikTok', short: 'TT', limit: 2200, video: true, note: 'วิดีโอ / สไลด์รูป' },
    line: { name: 'LINE OA', short: 'L', limit: 5000, note: 'ส่งถึงเพื่อนทุกคน' },
    yt: { name: 'YouTube Shorts', short: '▶', limit: 100, video: true, note: 'วิดีโอแนวตั้งเท่านั้น' },
    x: { name: 'X', short: 'X', limit: 280, note: 'ไม่เกิน 280 ตัวอักษร' },
  };
  const PF_KEYS = Object.keys(PLATFORMS);
  const pfBadge = (k, size = '') => `<span class="pf ${k} ${size}" title="${PLATFORMS[k].name}">${PLATFORMS[k].short}</span>`;

  /* ---------------- เวลา ---------------- */
  const TZ = 'Asia/Bangkok';
  const fmtDay = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const fmtNum = new Intl.NumberFormat('th-TH');
  const compact = n => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
  const DAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const at = (dayOffset, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = addDays(startOfDay(new Date()), dayOffset); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const whenLabel = iso => { const d = new Date(iso); const today = new Date(); const t = fmtTime.format(d); if (sameDay(d, today)) return `วันนี้ ${t}`; if (sameDay(d, addDays(today, 1))) return `พรุ่งนี้ ${t}`; return `${fmtDay.format(d)} ${t}`; };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = p => `${p}-${Math.random().toString(36).slice(2, 8)}`;

  /* ---------------- ข้อมูลตัวอย่าง ---------------- */
  function seed() {
    const acc = (on, name, extra = {}) => ({ on, name, ...extra });
    const workspaces = [
      { id: 'fitflow', name: 'FitFlow อารีย์', type: 'ฟิตเนส', color: '#C6FF3D', ink: '#0B0D10', alt: '#A78BFA', handle: 'fitflow.ari',
        accounts: { fb: acc(true, 'FitFlow อารีย์', { followers: 12400 }), ig: acc(true, '@fitflow.ari', { followers: 8300 }), tt: acc(true, '@fitflow.ari', { followers: 21000 }), line: acc(true, 'FitFlow OA', { followers: 1082, quota: 5000, used: 2164 }), yt: acc(false, ''), x: acc(false, '') },
        posters: [{ t: 'HIIT<br>Burn', s: 'คืนนี้ 18:00', k: 'a' }, { t: 'Renew<br>-10%', s: 'โค้ด RENEW10', k: 'b' }, { t: "Today's<br>Classes", s: '7 คลาส · ว่าง 38 ที่', k: 'a' }, { t: 'Yoga<br>Flow', s: 'เสาร์ 10:00', k: 'c' }] },
      { id: 'bean', name: 'Bean & Co. Café', type: 'ร้านกาแฟ', color: '#E0A96D', ink: '#1E130A', alt: '#7C9A6B', handle: 'beanandco',
        accounts: { fb: acc(true, 'Bean & Co. Café', { followers: 5600 }), ig: acc(true, '@beanandco', { followers: 14200 }), tt: acc(false, ''), line: acc(true, 'Bean & Co.', { followers: 640, quota: 5000, used: 1280 }), yt: acc(false, ''), x: acc(false, '') },
        posters: [{ t: 'New<br>Menu', s: 'Dirty Coffee เย็น', k: 'a' }, { t: 'Buy 1<br>Get 1', s: 'ทุกวันพุธ', k: 'b' }, { t: 'Open<br>7 AM', s: 'ทุกวัน 7:00–18:00', k: 'c' }, { t: 'Bean<br>Club', s: 'สะสมแต้ม', k: 'a' }] },
      { id: 'smile', name: 'คลินิกทันตกรรมยิ้มสวย', type: 'คลินิก', color: '#5EEAD4', ink: '#062A26', alt: '#93C5FD', handle: 'yimsuay.dental',
        accounts: { fb: acc(true, 'ยิ้มสวย Dental', { followers: 9100 }), ig: acc(false, ''), tt: acc(true, '@yimsuay.dental', { followers: 3300 }), line: acc(true, 'ยิ้มสวย Dental', { followers: 2310, quota: 5000, used: 4210 }), yt: acc(true, 'ยิ้มสวย Channel', { followers: 820 }), x: acc(false, '') },
        posters: [{ t: 'จัดฟัน<br>ใส', s: 'ผ่อน 0% 10 เดือน', k: 'a' }, { t: 'ขูด<br>หินปูน', s: 'เริ่ม 690.-', k: 'b' }, { t: 'Q&A', s: 'ถามหมอฟัน', k: 'c' }, { t: 'รีวิว', s: 'ยิ้มมั่นใจ', k: 'a' }] },
      { id: 'techforce', name: 'TechForce', type: 'เอเจนซี (แบรนด์เราเอง)', color: '#7C5CFF', ink: '#FFFFFF', alt: '#38BDF8', handle: 'techforce.th',
        accounts: { fb: acc(true, 'TechForce', { followers: 3200 }), ig: acc(true, '@techforce.th', { followers: 1900 }), tt: acc(true, '@techforce.th', { followers: 4700 }), line: acc(false, ''), yt: acc(true, 'TechForce TH', { followers: 640 }), x: acc(true, '@techforce_th', { followers: 410 }) },
        posters: [{ t: 'Web<br>App', s: 'ทำเว็บธุรกิจ', k: 'a' }, { t: 'Case<br>Study', s: 'FitFlow', k: 'b' }, { t: 'Tips', s: 'เทคนิคการตลาด', k: 'c' }, { t: 'Free<br>Demo', s: 'ทักแชทได้เลย', k: 'a' }] },
    ];
    const rule = (ws, icon, name, days, time, platforms, media, caption, on = true, event = '') => ({ id: uid('r'), ws, icon, name, days, time, platforms, media, caption, on, event });
    const WEEKDAYS = [1, 2, 3, 4, 5]; const ALL = [0, 1, 2, 3, 4, 5, 6];
    const rules = [
      rule('fitflow', '🗓', 'ตารางคลาสวันนี้', ALL, '07:00', ['fb', 'ig', 'line'], 2, "🗓 ตารางคลาสวันนี้ที่ FitFlow อารีย์\nจองผ่านแอปสมาชิกได้เลย 👉 fitflow.app/me"),
      rule('fitflow', '🔥', 'คลาสใกล้เต็ม → โพสต์เร่งจอง', ALL, '', ['ig', 'line'], 0, '🔥 {คลาส} เหลือแค่ {ที่ว่าง} ที่! รีบจองก่อนเต็ม', true, 'เมื่อคลาสเหลือที่ว่าง ≤ 5 ภายใน 3 ชม. ก่อนเริ่ม (ข้อมูลจาก FitFlow)'),
      rule('fitflow', '🎟', 'โปรสุดสัปดาห์', [5], '18:00', ['fb', 'ig', 'tt'], 1, '🎟 ต่ออายุตอนนี้ลด 10% ใช้โค้ด RENEW10 ถึงสิ้นเดือน'),
      rule('fitflow', '👋', 'ต้อนรับสมาชิกใหม่ประจำเดือน', [1], '09:00', ['fb'], 3, '👋 ยินดีต้อนรับสมาชิกใหม่ทุกคนเดือนนี้!', false),
      rule('bean', '☕', 'เมนูแนะนำประจำวัน', WEEKDAYS, '08:00', ['fb', 'ig'], 0, '☕ เมนูแนะนำวันนี้: Dirty Coffee เย็นฉ่ำ เปิด 7 โมงเช้า'),
      rule('bean', '🎁', 'โปร 1 แถม 1 วันพุธ', [3], '07:30', ['fb', 'ig', 'line'], 1, '🎁 วันพุธ ซื้อ 1 แถม 1 ทุกเมนูกาแฟ!'),
      rule('smile', '🦷', 'สาระสุขภาพฟัน', [2, 4], '12:00', ['fb', 'tt'], 2, '🦷 แปรงฟันนานแค่ไหนถึงจะสะอาด? คำตอบอยู่ในคลิปนี้'),
      rule('smile', '📅', 'เตือนคิวว่างสัปดาห์หน้า', [0], '19:00', ['line'], 1, '📅 สัปดาห์หน้ายังมีคิวว่าง จองผ่าน LINE ได้เลย'),
      rule('techforce', '💡', 'ทิปการตลาดออนไลน์', [1, 3, 5], '10:00', ['fb', 'ig', 'x'], 2, '💡 3 วิธีทำให้คนกดจองจากโพสต์มากขึ้น'),
    ];
    const post = (ws, offset, time, platforms, media, caption, status, stats) => ({ id: uid('p'), ws, at: at(offset, time), platforms, media, caption, status, stats: stats ?? null, error: null });
    const posts = [
      post('fitflow', -3, '07:00', ['fb'], 2, '🗓 ตารางคลาสวันจันทร์', 'posted', { fb: 2100 }),
      post('fitflow', -2, '12:00', ['ig'], 3, '⭐ รีวิวจากคุณศิริพร 3 เดือน -6 กก.', 'posted', { ig: 3100 }),
      post('fitflow', -1, '19:00', ['tt'], 0, '🔥 ท่าเด็ดลดพุง 15 วินาที', 'posted', { tt: 9200 }),
      { ...post('fitflow', -1, '07:00', ['fb'], 2, '🗓 ตารางคลาสวันพุธ', 'failed'), error: 'Facebook ปฏิเสธ: สิทธิ์ของเพจหมดอายุ — เชื่อมต่อใหม่ที่หน้าบัญชี' },
      post('fitflow', 0, '16:30', ['fb', 'ig', 'line'], 0, '🔥 HIIT Burn คืนนี้ 18:00 กับโค้ชบอส\nเหลือที่ว่างแค่ 5 ที่! 💪\nจองผ่านแอปสมาชิก 👉 fitflow.app/me\n#FitFlow #HIIT', 'scheduled'),
      post('fitflow', 2, '09:00', ['ig'], 3, '🧘 Yoga Flow เสาร์นี้ ยืดเหยียดคลายเครียด', 'draft'),
      post('bean', -2, '08:00', ['fb', 'ig'], 0, '☕ Dirty Coffee เย็นฉ่ำ', 'posted', { fb: 1400, ig: 4800 }),
      post('bean', 1, '15:00', ['ig'], 3, '💳 สมัคร Bean Club สะสมแต้มรับฟรี 1 แก้ว', 'scheduled'),
      post('smile', -1, '12:00', ['fb', 'tt'], 2, '🦷 ถามหมอฟัน: เสียวฟันเกิดจากอะไร?', 'posted', { fb: 2600, tt: 5400 }),
      post('smile', 1, '10:00', ['fb', 'line'], 0, '😁 จัดฟันใส ผ่อน 0% 10 เดือน', 'scheduled'),
      post('techforce', -1, '10:00', ['fb', 'x'], 1, '📈 Case Study: FitFlow ลดงานเคาน์เตอร์ 40%', 'posted', { fb: 900, x: 300 }),
    ];
    return { v: 1, current: 'fitflow', workspaces, rules, posts };
  }

  /* ---------------- เก็บสถานะ (localStorage · ใช้ไม่ได้ก็ยังทำงานในหน่วยความจำ) ---------------- */
  const KEY = 'tfs-state-v1';
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { S = seed(); }
  if (!S || S.v !== 1) S = seed();
  /* ---------------- โหมดเซิร์ฟเวอร์: เปิดผ่าน `node server/index.mjs` = ข้อมูลจริง + เชื่อมบัญชีจริง ---------------- */
  let SERVER = null; // ผลของ /api/health เมื่อเปิดผ่านเซิร์ฟเวอร์ (null = โหมดตัวอย่าง)
  async function api(method, path, body) {
    const isBlob = body instanceof Blob;
    const res = await fetch(path, { method, credentials: 'same-origin', headers: { 'X-TFS': '1', ...(isBlob ? { 'Content-Type': 'image/jpeg' } : body ? { 'Content-Type': 'application/json' } : {}) }, body: isBlob ? body : body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/login' && SERVER) { SERVER.authed = false; render(); }
    if (!res.ok) throw new Error(data.error ?? `ผิดพลาด (${String(res.status)})`);
    return data;
  }
  const loadCurrent = () => { try { return localStorage.getItem('tfs-current'); } catch { return null; } };
  function applyServerState(st) {
    const current = S?.current ?? loadCurrent();
    S = { v: 1, ...st, current: st.workspaces.some(w => w.id === current) ? current : st.workspaces[0]?.id };
    MEDIA = {};
    for (const w of S.workspaces) for (const u of w.uploads ?? []) MEDIA[u.id] = `/media/${u.id}.jpg`;
  }
  let pushTimer = 0;
  async function pushState() {
    try { applyServerState(await api('PUT', '/api/state', { workspaces: S.workspaces, rules: S.rules, posts: S.posts })); } catch (e) { toast(`บันทึกไม่สำเร็จ: ${e.message}`); }
  }
  /** บันทึกทันที (ใช้ก่อนสั่งโพสต์ เพื่อให้เซิร์ฟเวอร์มีโพสต์ล่าสุด) */
  const flush = async () => { clearTimeout(pushTimer); await pushState(); };
  const save = () => {
    if (SERVER) {
      try { localStorage.setItem('tfs-current', S.current); } catch { /* ไม่จำแบรนด์ก็ได้ */ }
      clearTimeout(pushTimer); pushTimer = setTimeout(pushState, 300);
      return;
    }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* โหมดส่วนตัว: ไม่บันทึกก็ไม่เป็นไร */ }
  };
  /* รูปที่อัปโหลด: เก็บแยก key (data URL ขนาดใหญ่) · state เก็บแค่รายชื่อรูปของแต่ละแบรนด์ */
  const MKEY = 'tfs-media-v1';
  let MEDIA = {};
  try { MEDIA = JSON.parse(localStorage.getItem(MKEY)) || {}; } catch { MEDIA = {}; }
  const saveMedia = () => { if (SERVER) return true; try { localStorage.setItem(MKEY, JSON.stringify(MEDIA)); return true; } catch { return false; } };
  const ws = () => S.workspaces.find(w => w.id === S.current) ?? S.workspaces[0];
  const connected = w => PF_KEYS.filter(k => w.accounts[k]?.on);
  const wsRules = () => S.rules.filter(r => r.ws === ws().id);
  const wsPosts = () => S.posts.filter(p => p.ws === ws().id);

  /* ---------------- โปสเตอร์ของแบรนด์ ---------------- */
  function posterStyle(w, k) {
    if (k === 'b') return `background:radial-gradient(circle at 80% 10%, ${w.color}55, transparent 60%), #10131a;color:#fff`;
    if (k === 'c') return `background:linear-gradient(150deg, ${w.alt}, color-mix(in srgb, ${w.alt} 55%, #000));color:#fff`;
    return `background:linear-gradient(150deg, ${w.color}, color-mix(in srgb, ${w.color} 70%, #000));color:${w.ink}`;
  }
  /** media = เลขเทมเพลต (0–3) หรือ 'u:<id>' = รูปที่อัปโหลด */
  const isUpload = m => typeof m === 'string' && m.startsWith('u:');
  const uploadOf = (w, m) => (isUpload(m) ? (w.uploads ?? []).find(u => u.id === m.slice(2)) : null);
  const parseMedia = v => (String(v).startsWith('u:') ? String(v) : Number(v));
  function poster(w, i, cls = '') {
    if (isUpload(i)) {
      const src = MEDIA[i.slice(2)];
      if (src) return `<div class="poster photo ${cls}"><img src="${src}" alt=""></div>`;
      i = 0; // รูปถูกลบไปแล้ว → ใช้เทมเพลตแรกแทน
    }
    const p = w.posters[i] ?? w.posters[0];
    const titleColor = p.k === 'b' ? `style="color:${w.color}"` : '';
    return `<div class="poster ${cls}" style="${posterStyle(w, p.k)}"><div class="pl"><i></i>${esc(w.name.split(' ')[0].toUpperCase())}</div><div class="pt" ${titleColor}>${p.t}</div><div class="ps">${esc(p.s)}</div></div>`;
  }

  /* ---------------- ไอคอน ---------------- */
  const IC = {
    autopilot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    compose: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    accounts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    brands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
  };
  const ROUTES = [
    { id: 'autopilot', label: 'Autopilot', long: 'โพสต์อัตโนมัติ' },
    { id: 'compose', label: 'เขียนโพสต์', long: 'เขียนโพสต์' },
    { id: 'calendar', label: 'ปฏิทิน', long: 'ปฏิทินโพสต์' },
    { id: 'accounts', label: 'บัญชี', long: 'บัญชีที่เชื่อม' },
    { id: 'brands', label: 'แบรนด์', long: 'แบรนด์ทั้งหมด' },
  ];

  /* ---------------- UI ทั่วไป ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const dlg = $('#dlg');
  // ปิดแล้วล้างฟอร์ม ไม่ให้ช่องกรอกที่ซ่อนอยู่ค้างในหน้า
  dlg.addEventListener('close', () => { dlg.innerHTML = ''; });
  function openDialog(html, onSubmit) {
    dlg.innerHTML = html;
    const form = $('form', dlg);
    if (form) form.addEventListener('submit', e => { e.preventDefault(); if (e.submitter?.value === 'cancel') { dlg.close(); return; } if (onSubmit(new FormData(form), e.submitter?.value) !== false) dlg.close(); });
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', () => dlg.close()));
    dlg.showModal();
    $('input, select, textarea, button', dlg)?.focus();
  }
  function confirmDialog(title, body, label, onYes, danger = false) {
    openDialog(`<form><h3>${esc(title)}</h3><p class="muted">${esc(body)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn ${danger ? 'danger' : ''}" value="ok">${esc(label)}</button></div></form>`, () => { onYes(); });
  }

  /* ---------------- ตัวสลับแบรนด์ + เมนู ---------------- */
  function renderChrome(route) {
    const w = ws();
    const av = x => `<span class="av" style="background:${x.color};color:${x.ink}">${esc(initials(x.name))}</span>`;
    $$('[data-ws]').forEach(el => {
      el.innerHTML = `<button type="button" aria-haspopup="true" aria-expanded="false">${av(w)}<span class="grow"><b>${esc(w.name)}</b><small>${esc(w.type)} · เชื่อม ${connected(w).length} ช่องทาง</small></span><span class="chev">▾</span></button>
        <div class="ws-menu" role="menu">${S.workspaces.map(x => `<button type="button" role="menuitem" data-switch="${x.id}" aria-current="${x.id === w.id}">${av(x)}<span class="grow"><b>${esc(x.name)}</b><small>${esc(x.type)}</small></span>${x.id === w.id ? '✓' : ''}</button>`).join('')}<hr><button type="button" role="menuitem" data-add-brand>＋ เพิ่มแบรนด์ใหม่</button></div>`;
      const btn = $('button', el), menu = $('.ws-menu', el);
      btn.addEventListener('click', e => { e.stopPropagation(); const open = !menu.classList.contains('open'); closeMenus(); menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); });
      $$('[data-switch]', el).forEach(b => b.addEventListener('click', () => { S.current = b.dataset.switch; save(); closeMenus(); render(); toast(`สลับเป็น ${ws().name}`); }));
      $('[data-add-brand]', el).addEventListener('click', () => { closeMenus(); brandDialog(); });
    });
    $('[data-nav]').innerHTML = ROUTES.map(r => `<a href="#/${r.id}" ${r.id === route ? 'aria-current="page"' : ''}>${IC[r.id]}${r.long}</a>`).join('');
    $('[data-tabbar]').innerHTML = ROUTES.map(r => `<a href="#/${r.id}" ${r.id === route ? 'aria-current="page"' : ''}>${IC[r.id]}${r.label}</a>`).join('');
  }
  const initials = name => name.replace(/[^A-Za-z0-9฀-๿ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '•';
  function closeMenus() { $$('.ws-menu.open').forEach(m => { m.classList.remove('open'); m.previousElementSibling?.setAttribute('aria-expanded', 'false'); }); }
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

  /* ---------------- กฎ → รอบถัดไป ---------------- */
  function nextRun(r, from = new Date()) {
    if (!r.time) return null; // กฎแบบเหตุการณ์ ไม่มีเวลาตายตัว
    const [h, m] = r.time.split(':').map(Number);
    for (let i = 0; i < 15; i++) {
      const d = addDays(startOfDay(from), i); d.setHours(h, m, 0, 0);
      if (r.days.includes(d.getDay()) && d > from && !(r.skip ?? []).includes(d.toISOString())) return d;
    }
    return null;
  }
  const daysLabel = days => (days.length === 7 ? 'ทุกวัน' : days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d)) ? 'จ–ศ' : days.map(d => DAY_TH[d]).join(' · '));
  const ruleWhen = r => (r.event ? r.event : `${daysLabel(r.days)} ${r.time} น.`);

  /* ======================= หน้า Autopilot ======================= */
  function viewAutopilot() {
    const w = ws(); const rules = wsRules(); const now = new Date();
    const upcoming = [
      ...wsPosts().filter(p => p.status === 'scheduled' && new Date(p.at) > now).map(p => ({ when: new Date(p.at), title: firstLine(p.caption), platforms: p.platforms, media: p.media, kind: 'post', id: p.id })),
      ...rules.filter(r => r.on && r.time).map(r => ({ when: nextRun(r, now), title: r.name, platforms: r.platforms, media: r.media, kind: 'rule', id: r.id })).filter(x => x.when),
    ].sort((a, b) => a.when - b.when).slice(0, 5);
    const weekAgo = addDays(now, -7);
    const reach = Object.fromEntries(PF_KEYS.map(k => [k, 0]));
    wsPosts().filter(p => p.status === 'posted' && new Date(p.at) > weekAgo && p.stats).forEach(p => Object.entries(p.stats).forEach(([k, v]) => { reach[k] += v; }));
    const maxReach = Math.max(1, ...Object.values(reach));
    const failed = wsPosts().filter(p => p.status === 'failed');
    const totalReach = Object.values(reach).reduce((a, b) => a + b, 0);
    const scheduled = wsPosts().filter(p => p.status === 'scheduled').length;

    return `
      <div class="topbar"><div class="page-title"><small>${esc(w.name)}</small><h1>โพสต์อัตโนมัติ</h1></div>
        <div class="row"><span class="badge acc">● เปิดอยู่ ${rules.filter(r => r.on).length} กฎ</span><a class="btn ghost" href="#/compose">${IC.compose.replace('<svg', '<svg width="18" height="18"')}เขียนโพสต์เอง</a><button class="btn" data-new-rule>＋ สร้างกฎ</button></div></div>
      ${failed.length ? `<div class="card" style="border-color:color-mix(in srgb,var(--danger) 45%,var(--line))"><div class="row"><span class="badge danger">โพสต์ไม่สำเร็จ ${failed.length}</span><span class="grow sm">${esc(failed[0].error ?? '')}</span><a class="btn small ghost" href="#/accounts">ไปที่บัญชี</a></div></div>` : ''}
      <div class="stats">
        <div class="card stat"><span class="sm muted">คนเห็น 7 วัน</span><b>${compact(totalReach)}</b><span class="xs muted">ทุกช่องทาง</span></div>
        <div class="card stat"><span class="sm muted">ตั้งเวลาไว้</span><b>${scheduled}</b><span class="xs muted">+ จากกฎอัตโนมัติ</span></div>
        <div class="card stat"><span class="sm muted">กฎที่เปิด</span><b>${rules.filter(r => r.on).length}/${rules.length}</b><span class="xs muted">ไม่เกิน 3 โพสต์/วัน/ช่องทาง</span></div>
        <div class="card stat"><span class="sm muted">ช่องทางที่เชื่อม</span><b>${connected(w).length}/6</b><span class="row" style="gap:3px">${connected(w).map(k => pfBadge(k, 'xs')).join('')}</span></div>
      </div>
      <div class="grid2">
        <section class="card" aria-labelledby="rules-h">
          <div class="card-h"><h2 id="rules-h">กฎโพสต์อัตโนมัติ</h2><span class="xs muted">กดสวิตช์เพื่อเปิด/ปิด · กดชื่อเพื่อแก้</span></div>
          ${rules.length ? rules.map(r => `<div class="rule ${r.on ? '' : 'off'}"><span class="ic" aria-hidden="true">${esc(r.icon)}</span>
            <div><button class="d" data-edit-rule="${r.id}" style="border:0;background:none;padding:0;text-align:left;font-size:15px"><b>${esc(r.name)}</b></button><span class="when">${esc(ruleWhen(r))}</span><div class="pfs">${r.platforms.map(k => pfBadge(k, 's')).join('')}</div></div>
            <button class="switch" role="switch" aria-checked="${r.on}" aria-label="เปิด/ปิด ${esc(r.name)}" data-toggle-rule="${r.id}"></button></div>`).join('') : '<p class="empty">ยังไม่มีกฎ กด “สร้างกฎ” เพื่อให้ระบบโพสต์ให้อัตโนมัติ</p>'}
        </section>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <section class="card" aria-labelledby="next-h"><div class="card-h"><h2 id="next-h">จะโพสต์ต่อไป</h2><span class="xs muted">ข้ามได้ก่อนถึงเวลา</span></div>
            <div class="next">${upcoming.length ? upcoming.map(u => `<div class="it">${poster(w, u.media)}<div><b>${esc(u.title)}</b><span class="xs muted">${whenLabel(u.when.toISOString())} · ${u.kind === 'rule' ? 'จากกฎ' : 'ตั้งเวลาเอง'}</span><div class="pfs">${u.platforms.map(k => pfBadge(k, 'xs')).join('')}</div></div>
              ${u.kind === 'post' ? `<button class="btn small ghost" data-open-post="${u.id}">ดู</button>` : `<button class="btn small ghost" data-skip-rule="${u.id}">ข้าม</button>`}</div>`).join('') : '<p class="empty">ยังไม่มีโพสต์ที่ตั้งเวลาไว้</p>'}</div></section>
          <section class="card" aria-labelledby="res-h"><div class="card-h"><h2 id="res-h">ผลลัพธ์ 7 วัน</h2><span class="xs muted">คนเห็น (ข้อมูลจำลอง)</span></div>
            <div class="bars">${PF_KEYS.filter(k => w.accounts[k]?.on).map(k => `<div class="r">${pfBadge(k, 's')}<span>${PLATFORMS[k].name.replace(' Shorts', '')}</span><span class="t"><i style="width:${Math.round(reach[k] / maxReach * 100)}%;background:${pfColor(k)}"></i></span><b>${compact(reach[k])}</b></div>`).join('')}</div></section>
          <section class="card" aria-labelledby="heat-h"><div class="card-h"><h2 id="heat-h">ช่วงเวลาที่คนดูเยอะ</h2><span class="xs muted">ใช้กับปุ่ม “✨ เวลาดีสุด”</span></div>${heatmap()}</section>
        </div>
      </div>`;
  }
  const pfColor = k => ({ fb: 'var(--fb)', ig: '#DD2A7B', tt: '#25F4EE', line: 'var(--line-oa)', yt: 'var(--yt)', x: 'var(--muted)' }[k]);
  const firstLine = s => String(s).split('\n')[0].slice(0, 80);
  const HEAT = [['07', [.7, .6, .7, .6, .8, .3, .2]], ['12', [.5, .5, .6, .5, .5, .6, .5]], ['18', [.9, .8, 1, .9, .7, .5, .4]], ['21', [.6, .7, .8, .7, .9, 1, .9]]];
  const heatmap = () => `<div class="heat" role="img" aria-label="ช่วงเวลาที่คนดูเยอะที่สุดคือ 18:00 วันพุธ และ 21:00 วันเสาร์"><span></span>${['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map(d => `<span>${d}</span>`).join('')}${HEAT.map(([h, v]) => `<span>${h}:00</span>${v.map(x => `<i style="opacity:${x}"></i>`).join('')}`).join('')}</div>`;
  /** เวลาที่ดีที่สุดถัดไป: ช่องที่ค่าสูงสุดในอีก 7 วัน */
  function bestTime() {
    const now = new Date(); let best = null, score = -1;
    for (let i = 0; i < 7; i++) for (const [h, v] of HEAT) {
      const d = addDays(startOfDay(now), i); d.setHours(Number(h), 0, 0, 0);
      const s = v[(d.getDay() + 6) % 7];
      if (d > addDays(now, 0) && d - now > 30 * 60000 && s > score) { score = s; best = d; }
    }
    return best;
  }

  function ruleDialog(id) {
    const w = ws(); const r = S.rules.find(x => x.id === id) ?? { id: null, icon: '📣', name: '', days: [1, 2, 3, 4, 5], time: '09:00', platforms: connected(w).slice(0, 2), media: 0, caption: '', on: true, event: '' };
    openDialog(`<form><h3>${r.id ? 'แก้กฎ' : 'สร้างกฎโพสต์อัตโนมัติ'}</h3>
      <div class="field"><label for="rn">ชื่อกฎ</label><input class="input" id="rn" name="name" required maxlength="60" value="${esc(r.name)}" placeholder="เช่น เมนูแนะนำประจำวัน"></div>
      ${r.event ? `<div class="field"><span class="label">โพสต์เมื่อ</span><p class="sm muted">${esc(r.event)}</p></div><div class="row" style="gap:12px">` : `<div class="field"><span class="label">วัน</span><div class="row">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="chip"><input type="checkbox" name="days" value="${d}" ${r.days.includes(d) ? 'checked' : ''}> ${DAY_TH[d]}</label>`).join('')}</div></div>
      <div class="row" style="gap:12px"><div class="field grow"><label for="rt">เวลา</label><input class="input" id="rt" type="time" name="time" value="${esc(r.time || '09:00')}" required></div>`}
        <div class="field grow"><label for="rm">รูป</label><select class="select" id="rm" name="media">${(w.uploads ?? []).map(u => `<option value="u:${u.id}" ${`u:${u.id}` === r.media ? 'selected' : ''}>รูป: ${esc(u.name)}</option>`).join('')}${w.posters.map((p, i) => `<option value="${i}" ${i === r.media ? 'selected' : ''}>เทมเพลต: ${esc(p.t.replace('<br>', ' '))}</option>`).join('')}</select></div></div>
      <div class="field"><label for="rc">ข้อความ</label><textarea class="ta" id="rc" name="caption" required maxlength="2000">${esc(r.caption)}</textarea></div>
      <div class="field"><span class="label">ช่องทาง</span><div class="row">${PF_KEYS.map(k => `<label class="chip" style="${w.accounts[k]?.on ? '' : 'opacity:.45'}"><input type="checkbox" name="pf" value="${k}" ${r.platforms.includes(k) ? 'checked' : ''} ${w.accounts[k]?.on ? '' : 'disabled'}> ${PLATFORMS[k].name}</label>`).join('')}</div><span class="xs muted">ช่องทางที่ยังไม่เชื่อม เลือกไม่ได้</span></div>
      <p class="xs" id="rerr" style="color:var(--danger)"></p>
      <div class="row" style="justify-content:space-between">${r.id ? '<button class="btn danger" value="delete">ลบกฎ</button>' : '<span></span>'}<div class="row"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn" value="save">บันทึก</button></div></div></form>`, (fd, action) => {
      if (action === 'delete') { S.rules = S.rules.filter(x => x.id !== r.id); save(); render(); toast('ลบกฎแล้ว'); return; }
      // กฎแบบเหตุการณ์ (เช่น คลาสใกล้เต็ม) ไม่มีวัน/เวลาตายตัว
      const days = r.event ? r.days : fd.getAll('days').map(Number); const pf = fd.getAll('pf');
      if (!days.length || !pf.length) { $('#rerr').textContent = 'เลือกอย่างน้อย 1 วัน และ 1 ช่องทาง'; return false; }
      const next = { ...r, name: String(fd.get('name')).trim(), days, time: r.event ? '' : String(fd.get('time')), media: parseMedia(fd.get('media')), caption: String(fd.get('caption')).trim(), platforms: pf };
      const run = nextRun(next);
      const commit = () => { if (r.id) Object.assign(S.rules.find(x => x.id === r.id), next); else S.rules.push({ ...next, id: uid('r'), ws: w.id }); save(); render(); };
      if (SERVER && !isUpload(next.media)) ensureUploaded(w, next.media).then(m => { next.media = m; commit(); }).catch(e => toast(`อัปโหลดรูปไม่สำเร็จ: ${e.message}`)); else commit(); toast(r.id ? 'บันทึกกฎแล้ว' : `สร้างกฎ “${next.name}” แล้ว${run ? ` · รอบถัดไป ${whenLabel(run.toISOString())}` : ''}`);
    });
  }

  /* ======================= หน้าเขียนโพสต์ ======================= */
  const C = { media: 0, caption: '', platforms: null, when: 'schedule', date: '', time: '', editing: null, tab: 'fb' };
  function resetComposer() {
    const w = ws(); const t = addDays(new Date(), 0); t.setHours(t.getHours() + 2, 0, 0, 0);
    Object.assign(C, { media: 0, caption: '', platforms: connected(w).filter(k => !PLATFORMS[k].video).slice(0, 3), when: 'schedule', date: isoDate(t), time: `${String(t.getHours()).padStart(2, '0')}:00`, editing: null, tab: null, ws: w.id });
  }
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function composerFor(postId) {
    const p = S.posts.find(x => x.id === postId);
    if (!p) return;
    const d = new Date(p.at);
    Object.assign(C, { media: p.media, caption: p.caption, platforms: [...p.platforms], when: 'schedule', date: isoDate(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, editing: p.id, tab: null, ws: p.ws });
  }
  function scheduledAt() {
    if (C.when === 'now') return new Date();
    if (C.when === 'best') return bestTime();
    const [y, m, d] = C.date.split('-').map(Number); const [h, mi] = C.time.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi);
  }
  function problems() {
    const out = []; const len = [...C.caption].length;
    if (!C.platforms.length) out.push(['e', 'เลือกอย่างน้อย 1 ช่องทาง']);
    if (!C.caption.trim()) out.push(['e', 'ยังไม่ได้เขียนข้อความ']);
    for (const k of C.platforms) {
      const lim = PLATFORMS[k].limit;
      if (len > lim) out.push(['e', `${PLATFORMS[k].name} รับได้ไม่เกิน ${fmtNum.format(lim)} ตัวอักษร (ตอนนี้ ${fmtNum.format(len)})`]);
      if (PLATFORMS[k].video) out.push(['w', `${PLATFORMS[k].name} ต้องเป็นวิดีโอ — ระบบจะทำสไลด์ภาพเคลื่อนไหวจากรูปให้อัตโนมัติ`]);
    }
    const up = uploadOf(ws(), C.media);
    if (up && C.platforms.some(k => PLATFORMS[k].video) && up.w > up.h) out.push(['w', 'รูปแนวนอน — TikTok / YouTube Shorts จะครอปเป็นแนวตั้ง 9:16']);
    if (up && C.platforms.includes('ig') && (up.w / up.h > 1.91 || up.w / up.h < 0.8)) out.push(['w', 'Instagram รับสัดส่วนรูป 4:5 ถึง 1.91:1 — ระบบจะครอปให้']);
    if (C.platforms.includes('ig') && /https?:\/\/|\w+\.(app|com|co|th)\//.test(C.caption)) out.push(['w', 'Instagram ไม่ทำลิงก์ในแคปชันให้กดได้ — แนะนำใส่ลิงก์ที่โปรไฟล์']);
    if (C.platforms.includes('line')) { const a = ws().accounts.line; out.push(['w', `LINE OA ส่งถึงเพื่อน ${fmtNum.format(a.followers)} คน · ใช้โควตาเดือนนี้ ${fmtNum.format(a.used + a.followers)}/${fmtNum.format(a.quota)}`]); if (a.used + a.followers > a.quota) out.push(['e', 'โควตาข้อความ LINE เดือนนี้ไม่พอ']); }
    if (C.when === 'schedule') { const t = scheduledAt(); if (!(t instanceof Date) || Number.isNaN(t.getTime())) out.push(['e', 'เลือกวันและเวลา']); else if (t < new Date()) out.push(['e', 'เวลาที่ตั้งผ่านไปแล้ว']); }
    return out;
  }
  function viewCompose() {
    const w = ws();
    if (C.ws !== w.id || !C.platforms) resetComposer();
    if (!C.tab || !C.platforms.includes(C.tab)) C.tab = C.platforms[0] ?? connected(w)[0] ?? 'fb';
    const best = bestTime();
    return `
      <div class="topbar"><div class="page-title"><small>${esc(w.name)}</small><h1>${C.editing ? 'แก้โพสต์' : 'เขียนโพสต์'}</h1></div>${C.editing ? '<button class="btn ghost" data-new-post>＋ เริ่มโพสต์ใหม่</button>' : ''}</div>
      <div class="grid2">
        <section class="card" aria-label="เขียนโพสต์" style="display:flex;flex-direction:column;gap:16px">
          <div class="field"><span class="label">รูป <span class="xs muted">— อัปโหลดรูปของคุณ หรือใช้เทมเพลตของแบรนด์</span></span>
            <div class="media" role="group" aria-label="เลือกรูป" id="media">
              <label class="upload" for="file"><input type="file" id="file" accept="image/*" multiple class="sr"><span aria-hidden="true">＋</span><b>อัปโหลดรูป</b><small>หรือลากไฟล์มาวาง</small></label>
              ${(w.uploads ?? []).map(u => `<span class="mwrap"><button type="button" aria-pressed="${`u:${u.id}` === C.media}" aria-label="รูปที่อัปโหลด ${esc(u.name)}" data-media="u:${u.id}">${poster(w, `u:${u.id}`)}</button><button type="button" class="mdel" data-del-media="${u.id}" aria-label="ลบรูป ${esc(u.name)}">×</button></span>`).join('')}
              ${w.posters.map((p, i) => `<button type="button" aria-pressed="${i === C.media}" aria-label="เทมเพลต ${esc(p.t.replace('<br>', ' '))}" data-media="${i}">${poster(w, i)}</button>`).join('')}</div></div>
          <div class="field"><label for="cap">ข้อความ</label>
            <textarea class="ta" id="cap" maxlength="5000" placeholder="เขียนข้อความโพสต์…">${esc(C.caption)}</textarea>
            <div class="row" style="justify-content:space-between"><div class="helpers"><button type="button" data-help="hook">✨ ขึ้นต้นให้น่าสนใจ</button><button type="button" data-help="cta">＋ ปุ่มชวนกด</button><button type="button" data-help="tags"># แฮชแท็ก</button></div><span class="xs muted" id="cnt"></span></div></div>
          <div class="field"><span class="label">ช่องทาง</span>
            <div class="pfgrid" role="group" aria-label="ช่องทาง">${PF_KEYS.map(k => { const a = w.accounts[k]; return `<button type="button" class="pftog" data-pf="${k}" aria-pressed="${C.platforms.includes(k)}" ${a?.on ? '' : 'disabled'}>${pfBadge(k)}<span class="t"><b>${PLATFORMS[k].name}</b><small>${a?.on ? esc(a.name) : 'ยังไม่เชื่อม'} · ${PLATFORMS[k].note}</small></span><span class="chk">✓</span></button>`; }).join('')}</div></div>
          <div class="field"><span class="label">เวลาโพสต์</span>
            <div class="row" role="radiogroup" aria-label="เวลาโพสต์">
              <button type="button" class="chip" role="radio" aria-pressed="${C.when === 'now'}" aria-checked="${C.when === 'now'}" data-when="now">โพสต์ทันที</button>
              <button type="button" class="chip" role="radio" aria-pressed="${C.when === 'schedule'}" aria-checked="${C.when === 'schedule'}" data-when="schedule">ตั้งเวลา</button>
              <button type="button" class="chip" role="radio" aria-pressed="${C.when === 'best'}" aria-checked="${C.when === 'best'}" data-when="best">✨ เวลาดีสุด · ${best ? whenLabel(best.toISOString()) : '—'}</button></div>
            ${C.when === 'schedule' ? `<div class="row" style="gap:10px;margin-top:4px"><input class="input" type="date" id="cdate" value="${C.date}" style="max-width:200px" aria-label="วันที่"><input class="input" type="time" id="ctime" value="${C.time}" style="max-width:140px" aria-label="เวลา"></div>` : ''}</div>
          <div class="warns" id="warns"></div>
          <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-save-draft>บันทึกร่าง</button><button class="btn" data-submit id="submit"></button></div>
        </section>
        <section class="card" aria-labelledby="pv-h" style="position:sticky;top:16px">
          <div class="card-h"><h2 id="pv-h">ตัวอย่างก่อนโพสต์</h2><span class="xs muted">หน้าตาโดยประมาณ</span></div>
          <div class="tabs" role="tablist" id="ptabs"></div>
          <div class="preview" id="pv"></div>
        </section>
      </div>`;
  }
  function refreshCompose() {
    const w = ws();
    const cnt = $('#cnt'); if (!cnt) return;
    const len = [...C.caption].length;
    const minLimit = Math.min(...C.platforms.map(k => PLATFORMS[k].limit), 5000);
    cnt.textContent = `${fmtNum.format(len)}${C.platforms.length ? ` / ${fmtNum.format(minLimit)}` : ''} ตัวอักษร`;
    cnt.style.color = len > minLimit ? 'var(--danger)' : '';
    const probs = problems();
    $('#warns').innerHTML = probs.map(([t, m]) => `<p class="${t}">${t === 'e' ? '✕' : '⚠'} ${esc(m)}</p>`).join('');
    const sub = $('#submit');
    const n = C.platforms.length;
    sub.textContent = C.editing ? 'บันทึกการแก้ไข' : C.when === 'now' ? `โพสต์ทันที ${n} ช่องทาง` : `ตั้งเวลาโพสต์ ${n} ช่องทาง`;
    sub.disabled = probs.some(p => p[0] === 'e');
    const tabs = C.platforms.length ? C.platforms : [];
    if (!tabs.includes(C.tab)) C.tab = tabs[0];
    $('#ptabs').innerHTML = tabs.map(k => `<button role="tab" aria-selected="${k === C.tab}" data-tab="${k}">${pfBadge(k, 'xs')}${PLATFORMS[k].name}</button>`).join('') || '<span class="sm muted" style="padding:6px">เลือกช่องทางเพื่อดูตัวอย่าง</span>';
    $('#pv').innerHTML = C.tab ? previewHtml(w, C.tab, C.caption, C.media, scheduledAt()) : '';
  }
  function previewHtml(w, k, caption, media, when) {
    const a = w.accounts[k] ?? { name: w.name };
    const av = `<i style="background:${w.color};color:${w.ink}">${esc(initials(w.name))}</i>`;
    const cap = esc(caption || 'ข้อความโพสต์จะแสดงที่นี่');
    const whenTxt = when instanceof Date && !Number.isNaN(when.getTime()) ? whenLabel(when.toISOString()) : '';
    const one = esc(firstLine(caption || 'ข้อความโพสต์'));
    switch (k) {
      case 'ig': return `<div class="pv"><div class="ph">${av}<div><b>${esc(a.name.replace('@', ''))}</b><small>ตั้งเวลา · ${whenTxt}</small></div></div>${poster(w, media)}<div class="bar" style="justify-content:flex-start;gap:16px;border:0">♡ <span>💬</span><span>➤</span></div><div class="cap"><b>${esc(a.name.replace('@', ''))}</b> ${one}${caption.includes('\n') ? ' <span style="color:#999">…เพิ่มเติม</span>' : ''}</div></div>`;
      case 'tt': case 'yt': return `<div class="pv tt">${poster(w, media, 'v916')}<div class="rail"><span><i></i>♥</span><span><i></i>💬</span><span><i></i>แชร์</span></div><div class="ov"><b>${esc(a.name)}</b><br>${one}</div></div>`;
      case 'line': return `<div class="pv line"><div class="msg">${poster(w, media)}<div class="cap" style="padding-top:10px">${esc(String(caption).split('\n').slice(0, 3).join('\n') || 'ข้อความ')}</div><span class="lbtn">ดูรายละเอียด</span></div></div>`;
      case 'x': return `<div class="pv x"><div class="ph">${av}<div><b>${esc(w.name)}</b><small>${esc(a.name)} · ${whenTxt}</small></div></div><div class="cap">${cap}</div>${poster(w, media)}<div class="bar"><span>💬</span><span>🔁</span><span>♡</span><span>📊</span></div></div>`;
      default: return `<div class="pv"><div class="ph">${av}<div><b>${esc(a.name)}</b><small>ตั้งเวลา · ${whenTxt} · 🌐</small></div></div><div class="cap">${cap}</div>${poster(w, media)}<div class="bar"><span>👍 ถูกใจ</span><span>💬 ความคิดเห็น</span><span>↗ แชร์</span></div></div>`;
    }
  }
  function bindCompose() {
    const cap = $('#cap');
    cap.addEventListener('input', () => { C.caption = cap.value; refreshCompose(); });
    $$('[data-media]').forEach(b => b.addEventListener('click', () => { C.media = parseMedia(b.dataset.media); $$('[data-media]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); refreshCompose(); }));
    $('#file').addEventListener('change', e => { addUploads(e.target.files); e.target.value = ''; });
    const zone = $('#media');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); addUploads(e.dataTransfer.files); });
    $$('[data-del-media]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.delMedia; confirmDialog('ลบรูปนี้?', 'โพสต์ที่ใช้รูปนี้จะเปลี่ยนเป็นเทมเพลตแรกแทน', 'ลบรูป', () => { if (C.media === `u:${id}`) C.media = 0; if (SERVER) { api('DELETE', `/api/media/${id}`).then(st => { applyServerState(st); render(); toast('ลบรูปแล้ว'); }).catch(e => toast(e.message)); return; } const w = ws(); w.uploads = (w.uploads ?? []).filter(u => u.id !== id); delete MEDIA[id]; saveMedia(); save(); render(); toast('ลบรูปแล้ว'); }, true); }));
    $$('[data-pf]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.pf; C.platforms = C.platforms.includes(k) ? C.platforms.filter(x => x !== k) : [...C.platforms, k]; b.setAttribute('aria-pressed', String(C.platforms.includes(k))); if (C.platforms.includes(k)) C.tab = k; refreshCompose(); }));
    $$('[data-when]').forEach(b => b.addEventListener('click', () => { C.when = b.dataset.when; render(); }));
    $('#cdate')?.addEventListener('input', e => { C.date = e.target.value; refreshCompose(); });
    $('#ctime')?.addEventListener('input', e => { C.time = e.target.value; refreshCompose(); });
    $('#ptabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) { C.tab = t.dataset.tab; refreshCompose(); } });
    const add = s => { C.caption = (C.caption.trim() ? `${C.caption.trimEnd()}\n` : '') + s; cap.value = C.caption; refreshCompose(); cap.focus(); };
    $$('[data-help]').forEach(b => b.addEventListener('click', () => {
      const w = ws();
      if (b.dataset.help === 'hook') { C.caption = `🔥 ${C.caption.trim() || (isUpload(C.media) ? w.name : w.posters[C.media].t.replace('<br>', ' '))} — ห้ามพลาด!`; cap.value = C.caption; refreshCompose(); }
      if (b.dataset.help === 'cta') add('👉 ทักแชทหรือกดลิงก์ในโปรไฟล์ได้เลย');
      if (b.dataset.help === 'tags') add(`#${w.name.split(' ')[0].replace(/[^\p{L}\p{N}]/gu, '')} #${w.type.split(' ')[0]} #โปรโมชั่น`);
    }));
    $('[data-new-post]')?.addEventListener('click', () => { resetComposer(); render(); });
    $('[data-submit]').addEventListener('click', () => savePost(C.when === 'now' ? 'posted' : 'scheduled'));
    $('[data-save-draft]').addEventListener('click', () => { if (!C.caption.trim()) { toast('เขียนข้อความก่อนบันทึกร่าง'); return; } savePost('draft'); });
    refreshCompose();
  }
  /** ย่อรูปให้ด้านยาวไม่เกิน max px แล้วเก็บเป็น JPEG (ลดพื้นที่ในเบราว์เซอร์) */
  function downscale(file, max = 1600, q = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(blob => resolve({ url: c.toDataURL('image/jpeg', q), blob, w: c.width, h: c.height }), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านรูปไม่ได้')); };
      img.src = url;
    });
  }
  async function uploadBlob(w, blob, name, width, height) {
    const r = await api('POST', `/api/media?ws=${encodeURIComponent(w.id)}&name=${encodeURIComponent(name.slice(0, 60))}&w=${String(width)}&h=${String(height)}`, blob);
    applyServerState(r.state);
    return `u:${r.id}`;
  }
  const shade = (hex, k) => `#${[1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;
  /** วาดเทมเพลตของแบรนด์เป็นรูป JPEG 1080×1080 (แพลตฟอร์มรับได้เฉพาะไฟล์รูป ไม่ใช่ HTML) */
  async function renderTemplate(w, i) {
    const p = w.posters[i] ?? w.posters[0];
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const g = c.getContext('2d');
    if (p.k === 'b') {
      g.fillStyle = '#10131a'; g.fillRect(0, 0, 1080, 1080);
      const rg = g.createRadialGradient(860, 110, 0, 860, 110, 760); rg.addColorStop(0, `${w.color}88`); rg.addColorStop(1, '#10131a00'); g.fillStyle = rg; g.fillRect(0, 0, 1080, 1080);
    } else {
      const base = p.k === 'c' ? w.alt : w.color;
      const lg = g.createLinearGradient(0, 0, 1080, 1080); lg.addColorStop(0, base); lg.addColorStop(1, shade(base, 0.7)); g.fillStyle = lg; g.fillRect(0, 0, 1080, 1080);
    }
    await Promise.all([document.fonts.load('italic 800 160px Kanit'), document.fonts.load('600 64px Kanit'), document.fonts.load('700 52px Kanit')]).catch(() => {});
    const fg = p.k === 'a' ? w.ink : '#ffffff';
    g.fillStyle = fg; g.fillRect(86, 96, 46, 46);
    g.font = '700 52px Kanit'; g.textBaseline = 'middle'; g.fillText(w.name.split(' ')[0].toUpperCase(), 156, 120);
    const lines = p.t.split('<br>').map(t => t.toUpperCase());
    let size = 180; g.font = `italic 800 ${String(size)}px Kanit`;
    while (size > 80 && Math.max(...lines.map(t => g.measureText(t).width)) > 900) { size -= 8; g.font = `italic 800 ${String(size)}px Kanit`; }
    g.fillStyle = p.k === 'b' ? w.color : fg;
    lines.forEach((t, j) => g.fillText(t, 86, 540 + (j - (lines.length - 1) / 2) * size * 0.95));
    g.fillStyle = fg; g.font = '600 62px Kanit'; g.fillText(p.s, 86, 960);
    return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.9));
  }
  /** โหมดเซิร์ฟเวอร์: ถ้าเลือกเทมเพลต → วาดเป็นรูปแล้วอัปโหลดก่อน */
  async function ensureUploaded(w, m) {
    if (!SERVER || isUpload(m)) return m;
    const blob = await renderTemplate(w, m);
    return uploadBlob(w, blob, `เทมเพลต ${w.posters[m]?.t.replace('<br>', ' ') ?? ''}`, 1080, 1080);
  }
  async function addUploads(files) {
    const w = ws(); w.uploads ??= [];
    let last = null;
    for (const f of [...files].slice(0, 10)) {
      if (!f.type.startsWith('image/')) { toast(`${f.name}: รองรับเฉพาะไฟล์รูป (JPG, PNG, WebP)`); continue; }
      if (f.size > 15e6) { toast(`${f.name}: ไฟล์ใหญ่เกิน 15 MB`); continue; }
      try {
        const r = await downscale(f);
        if (SERVER) { last = await uploadBlob(w, r.blob, f.name, r.w, r.h); continue; }
        const id = uid('m'); MEDIA[id] = r.url;
        w.uploads.unshift({ id, name: f.name.slice(0, 60), w: r.w, h: r.h });
        last = `u:${id}`;
      } catch { toast(`${f.name}: เปิดรูปไม่ได้`); }
    }
    if (!last) return;
    if (SERVER) { C.media = last; render(); toast('อัปโหลดรูปแล้ว'); return; }
    const stored = saveMedia(); save();
    C.media = last; render();
    toast(stored ? 'เพิ่มรูปแล้ว' : 'เพิ่มรูปแล้ว แต่พื้นที่เก็บในเบราว์เซอร์เต็ม — รูปจะหายเมื่อรีเฟรช (ลบรูปเก่าออกก่อน)');
  }
  async function savePost(status) {
    const w = ws(); const when = status === 'draft' ? (C.when === 'schedule' ? scheduledAt() : new Date()) : scheduledAt();
    const btn = $('#submit'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก…'; }
    let media = C.media;
    try { media = await ensureUploaded(w, C.media); } catch (e) { toast(`อัปโหลดรูปไม่สำเร็จ: ${e.message}`); refreshCompose(); return; }
    // โหมดเซิร์ฟเวอร์: "โพสต์ทันที" = บันทึกเป็นตั้งเวลา ณ ตอนนี้ แล้วสั่งเซิร์ฟเวอร์โพสต์จริง
    const realNow = SERVER && status === 'posted';
    const data = { ws: w.id, at: when.toISOString(), platforms: [...C.platforms], media, caption: C.caption.trim(), status: realNow ? 'scheduled' : status, error: null, stats: status === 'posted' && !SERVER ? Object.fromEntries(C.platforms.map(k => [k, 0])) : null };
    const id = C.editing ?? uid('p');
    if (C.editing) Object.assign(S.posts.find(p => p.id === C.editing), data); else S.posts.push({ ...data, id });
    if (SERVER) {
      await flush();
      if (realNow) {
        toast('กำลังโพสต์…');
        try { const r = await api('POST', `/api/posts/${id}/publish`); applyServerState(r.state); toast(publishSummary(r.post)); } catch (e) { toast(`โพสต์ไม่สำเร็จ: ${e.message}`); }
        resetComposer(); location.hash = '#/calendar'; render(); return;
      }
    } else save();
    const msg = status === 'posted' ? `โพสต์แล้ว ${C.platforms.length} ช่องทาง (จำลอง)` : status === 'draft' ? 'บันทึกร่างแล้ว' : `ตั้งเวลาแล้ว · ${whenLabel(when.toISOString())} · ${C.platforms.length} ช่องทาง`;
    resetComposer(); toast(msg); location.hash = '#/calendar';
  }

  function publishSummary(p) {
    const ok = Object.entries(p.results ?? {}).filter(([, r]) => r.ok).map(([k]) => PLATFORMS[k].name);
    if (p.status === 'posted') return `โพสต์แล้ว: ${ok.join(', ')}`;
    if (p.status === 'partial') return `โพสต์ได้บางช่องทาง (${ok.join(', ')}) — ดูรายละเอียดในปฏิทิน`;
    return `โพสต์ไม่สำเร็จ — ${p.error ?? ''}`.slice(0, 200);
  }

  /* ======================= ปฏิทิน ======================= */
  let weekOffset = 0;
  function viewCalendar() {
    const w = ws(); const now = new Date();
    const monday = addDays(startOfDay(now), -((now.getDay() + 6) % 7) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const end = addDays(monday, 7);
    const posts = wsPosts().filter(p => { const d = new Date(p.at); return d >= monday && d < end; });
    // กฎที่เปิด → รอบในสัปดาห์นี้ (ยังไม่ผ่าน)
    const ruleEvents = [];
    for (const r of wsRules().filter(x => x.on && x.time)) for (const d of days) {
      if (!r.days.includes(d.getDay())) continue;
      const [h, m] = r.time.split(':').map(Number); const t = new Date(d); t.setHours(h, m, 0, 0);
      if (t > now && !(r.skip ?? []).includes(t.toISOString())) ruleEvents.push({ rule: r, at: t });
    }
    const label = `${fmtDay.format(days[0])} – ${fmtDay.format(days[6])}`;
    return `
      <div class="topbar"><div class="page-title"><small>${esc(w.name)}</small><h1>ปฏิทินโพสต์</h1></div>
        <div class="row"><button class="btn ghost small" data-week="-1" aria-label="สัปดาห์ก่อน">‹</button><span class="chip">${label}</span><button class="btn ghost small" data-week="1" aria-label="สัปดาห์ถัดไป">›</button>${weekOffset ? '<button class="btn ghost small" data-week="0">สัปดาห์นี้</button>' : ''}<a class="btn" href="#/compose">＋ โพสต์ใหม่</a></div></div>
      <div class="row xs muted"><span class="badge">ตั้งเวลาเอง</span><span class="badge acc">จากกฎ</span><span class="badge ok">โพสต์แล้ว</span><span class="badge danger">ไม่สำเร็จ</span><span class="badge" style="border:1px dashed var(--line);background:none">ร่าง</span></div>
      <div class="card" style="padding:10px"><div class="cal">${days.map(d => {
        const items = [
          ...posts.filter(p => sameDay(new Date(p.at), d)).map(p => ({ t: new Date(p.at), html: `<button class="ev ${p.status}" data-open-post="${p.id}"><time>${fmtTime.format(new Date(p.at))}</time>${p.platforms.slice(0, 3).map(k => pfBadge(k, 'xs')).join('')}<span class="t">${esc(firstLine(p.caption))}</span>${p.status === 'posted' ? '✓' : p.status === 'failed' ? '!' : ''}</button>` })),
          ...ruleEvents.filter(e => sameDay(e.at, d)).map(e => ({ t: e.at, html: `<button class="ev" style="background:color-mix(in srgb,var(--accent) 14%,var(--s2))" data-rule-ev="${e.rule.id}" data-at="${e.at.toISOString()}"><time>${fmtTime.format(e.at)}</time>${e.rule.platforms.slice(0, 3).map(k => pfBadge(k, 'xs')).join('')}<span class="t">${esc(e.rule.icon)} ${esc(e.rule.name)}</span></button>` })),
        ].sort((a, b) => a.t - b.t);
        return `<div class="day ${sameDay(d, now) ? 'today' : ''}"><header><span>${DAY_TH[d.getDay()]} ${d.getDate()}</span>${sameDay(d, now) ? '<span>วันนี้</span>' : ''}</header>${items.map(i => i.html).join('') || '<span class="xs faint" style="padding:4px">—</span>'}</div>`;
      }).join('')}</div></div>`;
  }
  function postDialog(id) {
    const p = S.posts.find(x => x.id === id); if (!p) return;
    const w = S.workspaces.find(x => x.id === p.ws);
    const statusTxt = { scheduled: ['ตั้งเวลาแล้ว', ''], publishing: ['กำลังโพสต์', 'acc'], posted: ['โพสต์แล้ว', 'ok'], partial: ['โพสต์ได้บางช่องทาง', 'warn'], failed: ['ไม่สำเร็จ', 'danger'], draft: ['ร่าง', ''] }[p.status] ?? ['—', ''];
    const k = p.platforms[0];
    openDialog(`<form><div class="row" style="justify-content:space-between"><h3>${esc(firstLine(p.caption))}</h3><span class="badge ${statusTxt[1]}">${statusTxt[0]}</span></div>
      <p class="sm muted">${whenLabel(p.at)} · ${p.platforms.map(x => PLATFORMS[x].name).join(', ')}</p>
      ${p.results ? `<div class="warns">${Object.entries(p.results).map(([k, r]) => `<p class="${r.ok ? '' : 'e'}">${pfBadge(k, 'xs')} ${r.ok ? `โพสต์แล้ว${r.id ? ` · id ${esc(r.id)}` : ''}` : esc(r.error)}</p>`).join('')}</div>` : p.error ? `<p class="sm" style="color:var(--danger)">✕ ${esc(p.error)}</p>` : ''}
      ${p.stats ? `<div class="row">${Object.entries(p.stats).map(([x, v]) => `<span class="badge">${PLATFORMS[x].short} 👁 ${compact(v)}</span>`).join('')}</div>` : ''}
      <div class="preview" style="min-height:0;padding:0">${previewHtml(w, k, p.caption, p.media, new Date(p.at))}</div>
      <div class="row" style="justify-content:space-between"><button class="btn danger" value="delete">ลบ</button><div class="row">${!['posted', 'publishing'].includes(p.status) ? '<button class="btn ghost" value="edit">แก้ไข</button><button class="btn" value="now">โพสต์ตอนนี้</button>' : '<button class="btn ghost" value="cancel">ปิด</button>'}</div></div></form>`, (fd, action) => {
      if (action === 'delete') { confirmLater(() => confirmDialog('ลบโพสต์นี้?', 'ลบแล้วกู้คืนไม่ได้', 'ลบโพสต์', () => { S.posts = S.posts.filter(x => x.id !== p.id); save(); render(); toast('ลบโพสต์แล้ว'); }, true)); return; }
      if (action === 'edit') { composerFor(p.id); location.hash = '#/compose'; return; }
      if (action === 'now' && SERVER) {
        (async () => {
          if (!isUpload(p.media)) { try { p.media = await ensureUploaded(w, p.media); } catch (e) { toast(e.message); return; } }
          if (['failed', 'partial'].includes(p.status)) p.status = 'scheduled';
          await flush(); toast('กำลังโพสต์…');
          try { const r = await api('POST', `/api/posts/${p.id}/publish`); applyServerState(r.state); toast(publishSummary(r.post)); } catch (e) { toast(`โพสต์ไม่สำเร็จ: ${e.message}`); }
          render();
        })();
        return;
      }
      if (action === 'now') { Object.assign(p, { status: 'posted', at: new Date().toISOString(), error: null, stats: Object.fromEntries(p.platforms.map(x => [x, 0])) }); save(); render(); toast('โพสต์แล้ว (จำลอง)'); }
    });
  }
  const confirmLater = fn => setTimeout(fn, 0); // เปิด dialog ยืนยันหลังปิด dialog เดิม
  function ruleEventDialog(ruleId, iso) {
    const r = S.rules.find(x => x.id === ruleId); if (!r) return;
    openDialog(`<form><h3>${esc(r.icon)} ${esc(r.name)}</h3><p class="sm muted">รอบ ${whenLabel(iso)} · ${r.platforms.map(x => PLATFORMS[x].name).join(', ')} · สร้างจากกฎอัตโนมัติ</p>
      <div class="preview" style="min-height:0;padding:0">${previewHtml(ws(), r.platforms[0], r.caption, r.media, new Date(iso))}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="edit">แก้กฎ</button><button class="btn" value="skip">ข้ามรอบนี้</button></div></form>`, (fd, action) => {
      if (action === 'edit') { confirmLater(() => ruleDialog(r.id)); return; }
      if (action === 'skip') { r.skip = [...(r.skip ?? []), iso]; save(); render(); toast('ข้ามรอบนี้แล้ว'); }
    });
  }

  /* ======================= บัญชีที่เชื่อม ======================= */
  /** ข้อผิดพลาดล่าสุดของช่องทางนี้ (จากผลการโพสต์จริง) */
  function lastError(k) {
    const p = wsPosts().filter(x => x.results?.[k]).sort((a, b) => b.at.localeCompare(a.at))[0];
    return p && !p.results[k].ok ? p.results[k].error : null;
  }
  function viewAccounts() {
    const w = ws();
    return `
      <div class="topbar"><div class="page-title"><small>${esc(w.name)}</small><h1>บัญชีที่เชื่อม</h1></div></div>
      <div class="grid2">
        <section class="card" aria-labelledby="acc-h"><div class="card-h"><h2 id="acc-h">ช่องทางของ ${esc(w.name)}</h2><span class="xs muted">แต่ละแบรนด์เชื่อมบัญชีแยกกัน</span></div>
          ${PF_KEYS.map(k => { const a = w.accounts[k]; const fail = SERVER ? lastError(k) : k === 'fb' && wsPosts().some(p => p.status === 'failed'); return `<div class="acct">${pfBadge(k)}<div><b>${PLATFORMS[k].name}</b><span class="sm ${a?.on ? '' : 'muted'}">${a?.on ? `${esc(a.name)} · ผู้ติดตาม ${compact(a.followers ?? 0)}` : 'ยังไม่เชื่อม'}</span>${fail ? `<span class="xs" style="display:block;color:var(--danger)">${SERVER ? `ล่าสุด: ${esc(fail)}` : 'สิทธิ์หมดอายุ — กดเชื่อมต่อใหม่'}</span>` : ''}${SERVER && !SERVER.httpsReady && ['ig', 'line', 'tt'].includes(k) ? '<span class="xs" style="display:block;color:var(--warn)">ต้องตั้ง PUBLIC_BASE_URL แบบ https ก่อน จึงโพสต์ได้</span>' : ''}${k === 'line' && a?.on && a.quota ? `<span class="xs muted" style="display:block">โควตาข้อความเดือนนี้ ${fmtNum.format(a.used)}/${fmtNum.format(a.quota)}</span>` : ''}</div>
            ${a?.on ? `<div class="row">${fail ? `<button class="btn small" data-connect="${k}">เชื่อมต่อใหม่</button>` : '<span class="badge ok">● เชื่อมแล้ว</span>'}<button class="btn small ghost" data-disconnect="${k}">ยกเลิก</button></div>` : SERVER && k === 'yt' ? '<span class="badge">ยังไม่รองรับ (ต้องเป็นวิดีโอ)</span>' : `<button class="btn small" data-connect="${k}">เชื่อมต่อ</button>`}</div>`; }).join('')}
        </section>
        <section class="card"><div class="card-h"><h2>ตอนใช้งานจริง</h2></div>
          <ul class="sm muted" style="padding-left:18px;display:flex;flex-direction:column;gap:8px">
            <li>กดเชื่อมต่อ → ไปหน้าขอสิทธิ์ของแต่ละแพลตฟอร์ม (OAuth) แล้วเลือกเพจ/บัญชีของแบรนด์นั้น</li>
            <li>Facebook / Instagram ผ่าน Meta Graph API (IG ต้องเป็นบัญชีธุรกิจที่ผูกกับเพจ)</li>
            <li>TikTok ผ่าน Content Posting API · YouTube ผ่าน YouTube Data API · X ผ่าน X API</li>
            <li>LINE OA ผ่าน Messaging API (broadcast คิดตามโควตาข้อความของแพ็กเกจ)</li>
            <li>เก็บ token แบบเข้ารหัสฝั่ง server แยกตามแบรนด์ · แจ้งเตือนก่อนสิทธิ์หมดอายุ</li>
          </ul><p class="xs faint" style="margin-top:12px">${SERVER ? `เชื่อมกับเซิร์ฟเวอร์แล้ว${SERVER.dryRun ? ' · โหมดทดสอบ DRY_RUN (ไม่โพสต์ออกจริง)' : ' · โพสต์จริง'} · ตั้งค่าแล้ว: ${Object.entries(SERVER.configured).filter(([, v]) => v).map(([k]) => ({ meta: 'Facebook/IG', tiktok: 'TikTok', x: 'X', line: 'LINE' }[k])).join(', ')}` : 'โหมดตัวอย่าง (เปิดไฟล์ตรง ๆ): จำลองการเชื่อมต่อเท่านั้น — รัน `node server/index.mjs` เพื่อเชื่อมบัญชีจริง'}</p></section>
      </div>`;
  }
  function setupHint(name, vars) {
    openDialog(`<form><h3>ยังไม่ได้ตั้งค่า ${esc(name)}</h3><p class="sm muted">ใส่ ${esc(vars)} ในไฟล์ <code>.env</code> ของเซิร์ฟเวอร์ แล้วรีสตาร์ท — ขั้นตอนสมัคร developer app อยู่ใน README ของโปรเจกต์</p>${SERVER?.dryRun ? '<p class="sm">ตอนนี้เป็นโหมดทดสอบ (DRY_RUN) กด “เชื่อมแบบทดสอบ” เพื่อลองระบบโดยไม่โพสต์จริงได้</p>' : ''}<div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ปิด</button>${SERVER?.dryRun ? '<button class="btn" value="dry">เชื่อมแบบทดสอบ</button>' : ''}</div></form>`, (fd, action) => {
      if (action === 'dry') api('POST', '/api/dev/connect', { ws: ws().id, pf: pendingPf }).then(st => { applyServerState(st); render(); toast('เชื่อมแบบทดสอบแล้ว (ไม่โพสต์จริง)'); }).catch(e => toast(e.message));
    });
  }
  let pendingPf = null;
  function connectReal(k) {
    const w = ws(); const c = SERVER.configured; pendingPf = k;
    const go = pf => { location.href = `/api/oauth/${pf}/start?ws=${encodeURIComponent(w.id)}`; };
    if (k === 'fb' || k === 'ig') return c.meta ? go('meta') : setupHint('Meta (Facebook / Instagram)', 'META_APP_ID และ META_APP_SECRET');
    if (k === 'tt') return c.tiktok ? go('tiktok') : setupHint('TikTok', 'TIKTOK_CLIENT_KEY และ TIKTOK_CLIENT_SECRET');
    if (k === 'x') return c.x ? go('x') : setupHint('X', 'X_CLIENT_ID และ X_CLIENT_SECRET');
    if (k === 'yt') return toast('YouTube Shorts โพสต์ได้เฉพาะวิดีโอ — เวอร์ชันนี้ยังรองรับเฉพาะรูป');
    openDialog(`<form><h3>เชื่อม LINE OA</h3><p class="sm muted">LINE Developers → เลือก Channel ของ OA นี้ (Messaging API) → แท็บ Messaging API → “Channel access token (long-lived)” → Issue แล้วคัดลอกมาวาง</p>
      <div class="field"><label for="lt">Channel access token</label><input class="input" id="lt" name="token" required minlength="20" maxlength="400" autocomplete="off" spellcheck="false"></div>
      <p class="xs muted">token ถูกเข้ารหัสเก็บที่เซิร์ฟเวอร์ ไม่แสดงในหน้าเว็บอีก · การโพสต์ = broadcast ถึงเพื่อนทุกคน (ใช้โควตาข้อความของแพ็กเกจ OA)</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn" value="ok">เชื่อมต่อ</button></div></form>`, fd => {
      api('POST', '/api/accounts/line', { ws: w.id, token: String(fd.get('token')).trim() }).then(st => { applyServerState(st); render(); toast('เชื่อม LINE OA แล้ว'); }).catch(e => toast(`เชื่อมไม่สำเร็จ: ${e.message}`));
    });
  }
  /** กลับจากหน้าขอสิทธิ์ (?pick= เลือกเพจ · ?connected= · ?error=) */
  async function handleOAuthReturn() {
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
    if (![...q.keys()].length) return;
    history.replaceState(null, '', '#/accounts');
    if (q.get('error')) { toast(`เชื่อมไม่สำเร็จ: ${q.get('error') === 'state' ? 'หมดเวลาหรือคำขอไม่ถูกต้อง ลองใหม่' : q.get('error') === 'no_pages' ? 'บัญชีนี้ไม่ได้ดูแลเพจใดเลย' : q.get('error')}`); return; }
    if (q.get('connected')) { applyServerState(await api('GET', '/api/state')); render(); toast(`เชื่อม ${PLATFORMS[q.get('connected')]?.name ?? ''} แล้ว`); return; }
    const key = q.get('pick'); if (!key) return;
    try {
      const d = await api('GET', `/api/oauth/meta/pending/${key}`);
      openDialog(`<form><h3>เลือกเพจที่จะใช้กับแบรนด์นี้</h3><div class="field">${d.pages.map((pg, i) => `<label class="pftog" style="cursor:pointer"><input type="radio" name="page" value="${esc(pg.id)}" ${i === 0 ? 'checked' : ''}><span class="t"><b>${esc(pg.name)}</b><small>${pg.ig ? `Instagram: @${esc(pg.ig.username)}` : 'ไม่มีบัญชี Instagram ธุรกิจที่ผูกไว้'}</small></span></label>`).join('')}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn" value="ok">ใช้เพจนี้</button></div></form>`, fd => {
        api('POST', `/api/oauth/meta/pending/${key}`, { pageId: fd.get('page') }).then(st => { applyServerState(st); render(); toast('เชื่อม Facebook (และ Instagram ถ้ามี) แล้ว'); }).catch(e => toast(e.message));
      });
    } catch (e) { toast(e.message); }
  }
  function connectDialog(k) {
    if (SERVER) return connectReal(k);
    const w = ws(); const a = w.accounts[k] ?? {};
    openDialog(`<form><h3>เชื่อมต่อ ${PLATFORMS[k].name}</h3><p class="sm muted">ตอนใช้งานจริงจะเปิดหน้าขอสิทธิ์ของ ${PLATFORMS[k].name} · ในต้นแบบนี้ใส่ชื่อบัญชีเพื่อจำลอง</p>
      <div class="field"><label for="an">ชื่อเพจ / บัญชี</label><input class="input" id="an" name="name" required maxlength="60" value="${esc(a.name || (k === 'fb' || k === 'line' ? w.name : '@' + w.handle))}"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn" value="ok">เชื่อมต่อ (จำลอง)</button></div></form>`, fd => {
      w.accounts[k] = { ...a, on: true, name: String(fd.get('name')).trim(), followers: a.followers ?? 0, ...(k === 'line' ? { quota: a.quota ?? 500, used: a.used ?? 0 } : {}) };
      S.posts.filter(p => p.ws === w.id && p.status === 'failed' && p.platforms.includes(k)).forEach(p => { p.status = 'scheduled'; p.error = null; p.at = new Date(Date.now() + 3600e3).toISOString(); }); // โพสต์ที่ล้มเหลวลองใหม่ใน 1 ชม.
      save(); render(); toast(`เชื่อม ${PLATFORMS[k].name} แล้ว`);
    });
  }

  /* ======================= แบรนด์ทั้งหมด ======================= */
  function viewBrands() {
    const now = new Date(); const weekAgo = addDays(now, -7); const weekAhead = addDays(now, 7);
    return `
      <div class="topbar"><div class="page-title"><small>ทุกแบรนด์ที่ดูแล</small><h1>แบรนด์ทั้งหมด</h1></div><button class="btn" data-add-brand-page>＋ เพิ่มแบรนด์</button></div>
      <div class="brands">${S.workspaces.map(w => {
        const posts = S.posts.filter(p => p.ws === w.id);
        const reach = posts.filter(p => p.status === 'posted' && new Date(p.at) > weekAgo && p.stats).reduce((s, p) => s + Object.values(p.stats).reduce((a, b) => a + b, 0), 0);
        const upcoming = posts.filter(p => p.status === 'scheduled' && new Date(p.at) < weekAhead).length + S.rules.filter(r => r.ws === w.id && r.on && r.time).reduce((s, r) => s + r.days.length, 0);
        const failed = posts.filter(p => p.status === 'failed').length;
        return `<article class="card bcard"><div class="head"><span class="av" style="background:${w.color};color:${w.ink}">${esc(initials(w.name))}</span><div class="grow"><b class="d" style="font-size:17px">${esc(w.name)}</b><span class="xs muted" style="display:block">${esc(w.type)}</span></div>${w.id === S.current ? '<span class="badge acc">กำลังดู</span>' : ''}</div>
          <div class="row" style="gap:4px">${PF_KEYS.map(k => `<span style="${w.accounts[k]?.on ? '' : 'opacity:.25;filter:grayscale(1)'}">${pfBadge(k, 's')}</span>`).join('')}</div>
          <div class="nums"><div><b>${compact(reach)}</b>คนเห็น 7 วัน</div><div><b>${upcoming}</b>จะโพสต์ 7 วัน</div><div><b style="${failed ? 'color:var(--danger)' : ''}">${failed}</b>ไม่สำเร็จ</div></div>
          <div class="row"><button class="btn small" data-open-brand="${w.id}">เปิด Autopilot</button><button class="btn small ghost" data-open-brand="${w.id}" data-to="compose">เขียนโพสต์</button></div></article>`;
      }).join('')}</div>`;
  }
  function brandDialog() {
    const colors = ['#C6FF3D', '#E0A96D', '#5EEAD4', '#7C5CFF', '#F472B6', '#FBBF24', '#38BDF8'];
    openDialog(`<form><h3>เพิ่มแบรนด์ใหม่</h3><p class="sm muted">แต่ละแบรนด์มีบัญชีโซเชียล กฎ และโพสต์แยกกัน</p>
      <div class="field"><label for="bn">ชื่อแบรนด์</label><input class="input" id="bn" name="name" required maxlength="40" placeholder="เช่น ร้านขนมบ้านแม่"></div>
      <div class="field"><label for="bt">ประเภทธุรกิจ</label><input class="input" id="bt" name="type" required maxlength="30" placeholder="เช่น ร้านขนม"></div>
      <div class="field"><span class="label">สีแบรนด์</span><div class="row">${colors.map((c, i) => `<label class="chip" style="gap:8px"><input type="radio" name="color" value="${c}" ${i === 4 ? 'checked' : ''}><span style="width:18px;height:18px;border-radius:6px;background:${c}"></span></label>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">ยกเลิก</button><button class="btn" value="ok">เพิ่มแบรนด์</button></div></form>`, fd => {
      const name = String(fd.get('name')).trim(); const color = String(fd.get('color'));
      const dark = ['#7C5CFF'].includes(color);
      const id = uid('ws');
      const word = name.split(' ')[0];
      S.workspaces.push({ id, name, type: String(fd.get('type')).trim(), color, ink: dark ? '#fff' : '#0B0D10', alt: '#38BDF8', handle: word.toLowerCase(), accounts: Object.fromEntries(PF_KEYS.map(k => [k, { on: false, name: '' }])),
        posters: [{ t: esc(word).slice(0, 12), s: 'โปรโมชันใหม่', k: 'a' }, { t: 'New', s: 'สินค้าใหม่', k: 'b' }, { t: 'Sale', s: 'ลดพิเศษ', k: 'c' }, { t: 'Review', s: 'รีวิวลูกค้า', k: 'a' }] });
      S.current = id; save(); location.hash = '#/accounts'; render(); toast(`เพิ่ม ${name} แล้ว · เริ่มจากเชื่อมบัญชีโซเชียล`);
    });
  }

  /* ======================= router ======================= */
  const VIEWS = { autopilot: viewAutopilot, compose: viewCompose, calendar: viewCalendar, accounts: viewAccounts, brands: viewBrands };
  const routeOf = () => { const r = location.hash.replace('#/', '').split('?')[0]; return VIEWS[r] ? r : 'autopilot'; };
  function viewLogin() {
    return `<div style="min-height:70dvh;display:grid;place-items:center"><form class="card" id="login" style="width:min(400px,100%);display:flex;flex-direction:column;gap:14px">
      <div class="brand" style="padding:0"><span class="mark" aria-hidden="true"><svg viewBox="0 0 64 64" width="22" height="22"><circle cx="20" cy="40" r="7" fill="#fff"/><circle cx="44" cy="24" r="7" fill="#fff"/><circle cx="44" cy="46" r="5" fill="#fff" opacity=".8"/><path d="M20 40 44 24M20 40 44 46" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg></span><span><b>TechForce Social</b><small>เข้าสู่ระบบเพื่อจัดการโพสต์จริง</small></span></div>
      <div class="field"><label for="pw">รหัสผ่านผู้ดูแล</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <p class="xs" id="lerr" role="alert" style="color:var(--danger)"></p>
      <button class="btn">เข้าสู่ระบบ</button></form></div>`;
  }
  function render() {
    const locked = SERVER && !SERVER.authed;
    document.body.classList.toggle('locked', Boolean(locked));
    if (locked) {
      $('#view').innerHTML = viewLogin(); document.title = 'เข้าสู่ระบบ — TechForce Social';
      $('#login').addEventListener('submit', async e => {
        e.preventDefault();
        try { await api('POST', '/api/login', { password: $('#pw').value }); SERVER.authed = true; applyServerState(await api('GET', '/api/state')); startPolling(); render(); }
        catch (err) { $('#lerr').textContent = err.message; }
      });
      $('#pw').focus();
      return;
    }
    const route = routeOf();
    renderChrome(route);
    $('#view').innerHTML = `<div style="display:flex;flex-direction:column;gap:18px">${VIEWS[route]()}</div>`;
    document.title = `${ROUTES.find(r => r.id === route).long} · ${ws().name} — TechForce Social`;
    bind(route);
  }
  function bind(route) {
    const v = $('#view');
    v.querySelectorAll('[data-toggle-rule]').forEach(b => b.addEventListener('click', () => { const r = S.rules.find(x => x.id === b.dataset.toggleRule); r.on = !r.on; save(); render(); toast(`${r.on ? 'เปิด' : 'ปิด'}กฎ “${r.name}”`); }));
    v.querySelectorAll('[data-edit-rule]').forEach(b => b.addEventListener('click', () => ruleDialog(b.dataset.editRule)));
    v.querySelector('[data-new-rule]')?.addEventListener('click', () => ruleDialog(null));
    v.querySelectorAll('[data-skip-rule]').forEach(b => b.addEventListener('click', () => { const r = S.rules.find(x => x.id === b.dataset.skipRule); const t = nextRun(r); if (!t) return; r.skip = [...(r.skip ?? []), t.toISOString()]; save(); render(); toast(`ข้ามรอบ ${whenLabel(t.toISOString())} แล้ว`); }));
    v.querySelectorAll('[data-open-post]').forEach(b => b.addEventListener('click', () => postDialog(b.dataset.openPost)));
    v.querySelectorAll('[data-rule-ev]').forEach(b => b.addEventListener('click', () => ruleEventDialog(b.dataset.ruleEv, b.dataset.at)));
    v.querySelectorAll('[data-week]').forEach(b => b.addEventListener('click', () => { weekOffset = b.dataset.week === '0' ? 0 : weekOffset + Number(b.dataset.week); render(); }));
    v.querySelectorAll('[data-connect]').forEach(b => b.addEventListener('click', () => connectDialog(b.dataset.connect)));
    v.querySelectorAll('[data-disconnect]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.disconnect; confirmDialog(`ยกเลิกการเชื่อม ${PLATFORMS[k].name}?`, 'โพสต์และกฎที่ใช้ช่องทางนี้จะข้ามช่องทางนี้ไป', 'ยกเลิกการเชื่อม', () => { if (SERVER) { api('DELETE', `/api/accounts/${ws().id}/${k}`).then(st => { applyServerState(st); render(); toast(`ยกเลิกการเชื่อม ${PLATFORMS[k].name} แล้ว`); }).catch(e => toast(e.message)); return; } ws().accounts[k].on = false; save(); render(); toast(`ยกเลิกการเชื่อม ${PLATFORMS[k].name} แล้ว`); }, true); }));
    v.querySelectorAll('[data-open-brand]').forEach(b => b.addEventListener('click', () => { S.current = b.dataset.openBrand; save(); location.hash = `#/${b.dataset.to ?? 'autopilot'}`; render(); }));
    v.querySelector('[data-add-brand-page]')?.addEventListener('click', brandDialog);
    if (route === 'compose') bindCompose();
    if (route === 'accounts' && SERVER && location.hash.includes('?')) handleOAuthReturn();
  }
  window.addEventListener('hashchange', () => { render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); });

  /* ธีม + รีเซ็ต */
  try { const t = localStorage.getItem('tfs-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ใช้ค่าเริ่มต้น */ }
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; try { localStorage.setItem('tfs-theme', t); } catch { /* ไม่บันทึกก็ได้ */ }
  }));
  $('[data-reset]').addEventListener('click', () => {
    if (SERVER) { api('POST', '/api/logout').finally(() => { SERVER.authed = false; render(); }); return; }
    confirmDialog('รีเซ็ตข้อมูลตัวอย่าง?', 'โพสต์ กฎ และแบรนด์ที่เพิ่มเองจะหายทั้งหมด', 'รีเซ็ต', () => { S = seed(); MEDIA = {}; saveMedia(); save(); resetComposer(); render(); toast('รีเซ็ตข้อมูลตัวอย่างแล้ว'); }, true);
  });

  /* ดึงสถานะล่าสุด (ผลการโพสต์จากตัวตั้งเวลา) ทุก 20 วินาที — ไม่รบกวนตอนเปิด dialog หรือกำลังเขียนโพสต์ */
  let polling = 0;
  function startPolling() {
    if (polling) return;
    polling = setInterval(async () => {
      if (!SERVER?.authed || dlg.open || document.hidden || routeOf() === 'compose') return;
      try {
        const st = await api('GET', '/api/state');
        if (JSON.stringify([st.posts, st.workspaces, st.rules]) !== JSON.stringify([S.posts, S.workspaces, S.rules])) { applyServerState(st); render(); }
      } catch { /* ลองใหม่รอบหน้า */ }
    }, 20000);
  }
  async function boot() {
    if (location.protocol.startsWith('http')) {
      try { const h = await (await fetch('/api/health', { credentials: 'same-origin' })).json(); if (h?.server) SERVER = h; } catch { /* เปิดแบบไฟล์ static → โหมดตัวอย่าง */ }
    }
    if (SERVER) {
      $('.side .foot span').textContent = `เชื่อมเซิร์ฟเวอร์แล้ว${SERVER.dryRun ? ' · โหมดทดสอบ (ไม่โพสต์จริง)' : ' · โพสต์จริง'}`;
      $('[data-reset]').textContent = 'ออกจากระบบ';
      if (SERVER.authed) { try { applyServerState(await api('GET', '/api/state')); startPolling(); } catch (e) { toast(e.message); } }
    }
    render();
  }
  boot();
})();
