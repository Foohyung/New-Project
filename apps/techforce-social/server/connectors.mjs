/*
 * ตัวเชื่อมแต่ละแพลตฟอร์ม — OAuth (ขอสิทธิ์) + โพสต์รูปพร้อมข้อความ
 * ทุกฟังก์ชันรับ fetch จากภายนอก (ทดสอบด้วย fetch จำลองได้) · ข้อความ error เป็นภาษาไทยให้ผู้ใช้อ่านเข้าใจ
 * อ้างอิง: Meta Graph API (Pages photos, Instagram content publishing), LINE Messaging API (broadcast),
 *          X API v2 (/2/media/upload, /2/tweets, OAuth 2.0 PKCE), TikTok Content Posting API (photo post, PULL_FROM_URL)
 * ต้องทดสอบกับบัญชีจริงอีกครั้งเมื่อได้ developer app — ชื่อ field ของ API อาจเปลี่ยนตามเวอร์ชัน
 */

async function call(fetchFn, url, init = {}, label = 'API') {
  let res;
  try { res = await fetchFn(url, init); } catch (e) { throw new Error(`${label}: เชื่อมต่อไม่ได้ (${e.message})`); }
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
  // TikTok ส่ง error: { code: 'ok' } มากับทุกคำตอบที่สำเร็จ — ไม่ใช่ข้อผิดพลาด
  const apiError = body?.error && !(typeof body.error === 'object' && body.error.code === 'ok');
  if (!res.ok || apiError) {
    const msg = body?.error?.message ?? body?.error_description ?? body?.detail ?? body?.message ?? body?.title ?? (typeof body?.error === 'string' ? body.error : '') ?? '';
    throw new Error(`${label} ปฏิเสธ (${res.status}): ${String(msg || text).slice(0, 240)}`);
  }
  return { body, res };
}
const form = obj => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
const imageBlob = image => new Blob([image.bytes], { type: 'image/jpeg' });
const needPublicUrl = (url, who) => { if (!/^https:\/\//.test(url ?? '')) throw new Error(`${who} ต้องดึงรูปจาก URL สาธารณะแบบ https — ตั้งค่า PUBLIC_BASE_URL ให้เป็นโดเมน https ของเซิร์ฟเวอร์นี้`); };

/* ===================== Meta: Facebook Page + Instagram (บัญชีธุรกิจที่ผูกกับเพจ) ===================== */
export const meta = {
  scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'business_management'],
  authUrl({ cfg, state, redirectUri }) {
    const u = new URL(`https://www.facebook.com/${cfg.meta.version}/dialog/oauth`);
    u.search = form({ client_id: cfg.meta.appId, redirect_uri: redirectUri, state, response_type: 'code', scope: meta.scopes.join(',') }).toString();
    return u.toString();
  },
  /** แลก code → user token (อายุยาว) → รายชื่อเพจที่ผู้ใช้ดูแล พร้อม page token และบัญชี IG ที่ผูกไว้ */
  async exchange({ cfg, code, redirectUri, fetch: f }) {
    const G = `https://graph.facebook.com/${cfg.meta.version}`;
    const { body: short } = await call(f, `${G}/oauth/access_token?${form({ client_id: cfg.meta.appId, client_secret: cfg.meta.appSecret, redirect_uri: redirectUri, code })}`, {}, 'Facebook');
    const { body: long } = await call(f, `${G}/oauth/access_token?${form({ grant_type: 'fb_exchange_token', client_id: cfg.meta.appId, client_secret: cfg.meta.appSecret, fb_exchange_token: short.access_token })}`, {}, 'Facebook');
    const { body: pages } = await call(f, `${G}/me/accounts?${form({ fields: 'id,name,access_token,fan_count,instagram_business_account{id,username,followers_count}', limit: 100, access_token: long.access_token })}`, {}, 'Facebook');
    return (pages.data ?? []).map(p => ({ id: p.id, name: p.name, token: p.access_token, followers: p.fan_count ?? 0, ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username, followers: p.instagram_business_account.followers_count ?? 0 } : null }));
  },
  /** โพสต์รูปขึ้นเพจ — ส่งไฟล์รูปโดยตรง (ไม่ต้องมี URL สาธารณะ) */
  async publishFb({ cfg, secret, caption, image, fetch: f }) {
    const fd = new FormData();
    fd.set('source', imageBlob(image), 'post.jpg');
    fd.set('caption', caption);
    fd.set('published', 'true');
    fd.set('access_token', secret.token);
    const { body } = await call(f, `https://graph.facebook.com/${cfg.meta.version}/${secret.pageId}/photos`, { method: 'POST', body: fd }, 'Facebook');
    return body.post_id ?? body.id;
  },
  /** Instagram: สร้าง container จาก URL รูป → รอให้พร้อม → publish */
  async publishIg({ cfg, secret, caption, imageUrl, fetch: f, wait = ms => new Promise(r => setTimeout(r, ms)) }) {
    needPublicUrl(imageUrl, 'Instagram');
    const G = `https://graph.facebook.com/${cfg.meta.version}`;
    const { body: c } = await call(f, `${G}/${secret.igId}/media`, { method: 'POST', body: form({ image_url: imageUrl, caption, access_token: secret.token }) }, 'Instagram');
    for (let i = 0; i < 10; i++) {
      const { body: s } = await call(f, `${G}/${c.id}?${form({ fields: 'status_code', access_token: secret.token })}`, {}, 'Instagram');
      if (s.status_code === 'FINISHED' || !s.status_code) break;
      if (s.status_code === 'ERROR') throw new Error('Instagram ประมวลผลรูปไม่สำเร็จ (ตรวจว่าเป็น JPEG และสัดส่วน 4:5–1.91:1)');
      await wait(1500);
    }
    const { body } = await call(f, `${G}/${secret.igId}/media_publish`, { method: 'POST', body: form({ creation_id: c.id, access_token: secret.token }) }, 'Instagram');
    return body.id;
  },
};

/* ===================== LINE OA (Messaging API · broadcast ถึงเพื่อนทุกคน) ===================== */
export const line = {
  /** ตรวจ channel access token และคืนชื่อ OA */
  async verify({ token, fetch: f }) {
    const { body } = await call(f, 'https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${token}` } }, 'LINE');
    return { name: body.displayName ?? body.basicId ?? 'LINE OA', basicId: body.basicId ?? '' };
  },
  async publish({ secret, caption, imageUrl, fetch: f }) {
    needPublicUrl(imageUrl, 'LINE');
    const messages = [{ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl }];
    if (caption) messages.push({ type: 'text', text: caption.slice(0, 5000) });
    const { res } = await call(f, 'https://api.line.me/v2/bot/message/broadcast', { method: 'POST', headers: { Authorization: `Bearer ${secret.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) }, 'LINE');
    return res.headers.get('x-line-request-id') ?? 'sent';
  },
};

/* ===================== X (OAuth 2.0 + PKCE) ===================== */
const X_API = 'https://api.x.com/2';
const xAuthHeader = cfg => (cfg.x.clientSecret ? { Authorization: `Basic ${Buffer.from(`${cfg.x.clientId}:${cfg.x.clientSecret}`).toString('base64')}` } : {});
export const x = {
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'],
  authUrl({ cfg, state, redirectUri, challenge }) {
    const u = new URL('https://x.com/i/oauth2/authorize');
    u.search = form({ response_type: 'code', client_id: cfg.x.clientId, redirect_uri: redirectUri, scope: x.scopes.join(' '), state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return u.toString();
  },
  async exchange({ cfg, code, redirectUri, verifier, fetch: f, now = Date.now() }) {
    const { body: t } = await call(f, `${X_API}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...xAuthHeader(cfg) }, body: form({ code, grant_type: 'authorization_code', redirect_uri: redirectUri, code_verifier: verifier, client_id: cfg.x.clientId }) }, 'X');
    const { body: me } = await call(f, `${X_API}/users/me?user.fields=public_metrics`, { headers: { Authorization: `Bearer ${t.access_token}` } }, 'X');
    return { token: t.access_token, refresh: t.refresh_token, expiresAt: now + (t.expires_in ?? 7200) * 1000, name: `@${me.data?.username ?? ''}`, followers: me.data?.public_metrics?.followers_count ?? 0 };
  },
  async refresh({ cfg, secret, fetch: f, now = Date.now() }) {
    const { body: t } = await call(f, `${X_API}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...xAuthHeader(cfg) }, body: form({ refresh_token: secret.refresh, grant_type: 'refresh_token', client_id: cfg.x.clientId }) }, 'X');
    return { ...secret, token: t.access_token, refresh: t.refresh_token ?? secret.refresh, expiresAt: now + (t.expires_in ?? 7200) * 1000 };
  },
  async publish({ secret, caption, image, fetch: f }) {
    if ([...caption].length > 280) throw new Error('X รับข้อความไม่เกิน 280 ตัวอักษร');
    const fd = new FormData();
    fd.set('media', imageBlob(image), 'post.jpg');
    fd.set('media_category', 'tweet_image');
    const { body: m } = await call(f, `${X_API}/media/upload`, { method: 'POST', headers: { Authorization: `Bearer ${secret.token}` }, body: fd }, 'X');
    const mediaId = m.data?.id ?? m.media_id_string ?? m.id;
    const { body } = await call(f, `${X_API}/tweets`, { method: 'POST', headers: { Authorization: `Bearer ${secret.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: caption, media: { media_ids: [String(mediaId)] } }) }, 'X');
    return body.data?.id;
  },
};

/* ===================== TikTok (Content Posting API · โพสต์รูปแบบสไลด์) ===================== */
const TT = 'https://open.tiktokapis.com/v2';
export const tiktok = {
  scopes: ['user.info.basic', 'video.publish'],
  authUrl({ cfg, state, redirectUri }) {
    const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
    u.search = form({ client_key: cfg.tiktok.clientKey, scope: tiktok.scopes.join(','), response_type: 'code', redirect_uri: redirectUri, state }).toString();
    return u.toString();
  },
  async exchange({ cfg, code, redirectUri, fetch: f, now = Date.now() }) {
    const { body: t } = await call(f, `${TT}/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_key: cfg.tiktok.clientKey, client_secret: cfg.tiktok.clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }) }, 'TikTok');
    const { body: u } = await call(f, `${TT}/user/info/?fields=display_name,username`, { headers: { Authorization: `Bearer ${t.access_token}` } }, 'TikTok');
    return { token: t.access_token, refresh: t.refresh_token, openId: t.open_id, expiresAt: now + (t.expires_in ?? 86400) * 1000, name: `@${u.data?.user?.username ?? u.data?.user?.display_name ?? 'tiktok'}`, followers: 0 };
  },
  async refresh({ cfg, secret, fetch: f, now = Date.now() }) {
    const { body: t } = await call(f, `${TT}/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_key: cfg.tiktok.clientKey, client_secret: cfg.tiktok.clientSecret, grant_type: 'refresh_token', refresh_token: secret.refresh }) }, 'TikTok');
    return { ...secret, token: t.access_token, refresh: t.refresh_token ?? secret.refresh, expiresAt: now + (t.expires_in ?? 86400) * 1000 };
  },
  async publish({ secret, caption, imageUrl, fetch: f }) {
    needPublicUrl(imageUrl, 'TikTok');
    const auth = { Authorization: `Bearer ${secret.token}`, 'Content-Type': 'application/json; charset=UTF-8' };
    // ต้องถาม creator info ก่อนทุกครั้ง (กติกาของ TikTok) — แอปที่ยังไม่ผ่าน audit จะมีแค่ SELF_ONLY
    const { body: ci } = await call(f, `${TT}/post/publish/creator_info/query/`, { method: 'POST', headers: auth, body: '{}' }, 'TikTok');
    const options = ci.data?.privacy_level_options ?? ['SELF_ONLY'];
    const privacy = options.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : options[0];
    const { body } = await call(f, `${TT}/post/publish/content/init/`, { method: 'POST', headers: auth, body: JSON.stringify({
      post_info: { title: caption.split('\n')[0].slice(0, 90), description: caption.slice(0, 4000), privacy_level: privacy, disable_comment: false, auto_add_music: true },
      source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [imageUrl] },
      post_mode: 'DIRECT_POST', media_type: 'PHOTO',
    }) }, 'TikTok');
    if (body.error && body.error.code && body.error.code !== 'ok') throw new Error(`TikTok ปฏิเสธ: ${body.error.message ?? body.error.code}`);
    return body.data?.publish_id;
  },
};

/** โพสต์ช่องทางเดียว · ต่ออายุ token ให้เองถ้าหมดอายุ (คืน secret ใหม่ให้บันทึก) */
export async function publishTo(pf, { cfg, secret, caption, image, imageUrl, fetch: f, now = Date.now() }) {
  let s = secret;
  let renewed = null;
  if ((pf === 'x' || pf === 'tt') && typeof s.expiresAt === 'number' && s.expiresAt - now < 60000) {
    s = await (pf === 'x' ? x : tiktok).refresh({ cfg, secret: s, fetch: f, now });
    renewed = s;
  }
  let id;
  switch (pf) {
    case 'fb': id = await meta.publishFb({ cfg, secret: s, caption, image, fetch: f }); break;
    case 'ig': id = await meta.publishIg({ cfg, secret: s, caption, imageUrl, fetch: f }); break;
    case 'line': id = await line.publish({ secret: s, caption, imageUrl, fetch: f }); break;
    case 'x': id = await x.publish({ secret: s, caption, image, fetch: f }); break;
    case 'tt': id = await tiktok.publish({ secret: s, caption, imageUrl, fetch: f }); break;
    case 'yt': throw new Error('YouTube Shorts โพสต์ได้เฉพาะวิดีโอ — เวอร์ชันนี้ยังรองรับเฉพาะรูป');
    default: throw new Error(`ไม่รู้จักช่องทาง ${pf}`);
  }
  return { id: String(id ?? ''), renewed };
}
