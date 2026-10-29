// Builds the profile README: one light/dark SVG card in the style of yuna1107.com.
// Usage: node scripts/build.mjs
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import * as C from './content.mjs';
import {
  ROOT, THEMES, Doc, text, icon, measure, wrap, truncate, imageData, remoteImage, loadMetrics, fill, stroke, esc,
} from './lib.mjs';

const OUT = path.join(ROOT, 'assets');
const CACHE = path.join(ROOT, 'cache');
const W = 880, PAD = 40, CW = W - 2 * PAD;

// Fetches live data, falling back to the last good copy so one bad run doesn't blank a section.
async function fetchJson(name, urls) {
  const file = path.join(CACHE, `${name}.json`);
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      await writeFile(file, `${JSON.stringify(data, null, 1)}\n`);
      return { data, fresh: true };
    } catch (e) {
      console.warn(`! ${url}: ${e.message}`);
    }
  }
  try {
    return { data: JSON.parse(await readFile(file, 'utf8')), fresh: false };
  } catch {
    return { data: null, fresh: false };
  }
}

const jstDate = (iso) => new Date(iso || Date.now()).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });

/* ---------- Sections. Each draws from y and returns the next y. ---------- */

function hero(doc, y) {
  const t = doc.t, cx = W / 2, tw = measure(C.hero.name, 76);
  const grad = doc.textGradient(cx - tw / 2, tw, [[0.2, t.text], [0.6, t.accent], [1, t.violet]]);
  let b = text(C.hero.name, { x: cx, y: y + 116, size: 76, weight: 700, anchor: 'middle', ls: -0.5, color: grad });
  b += text(C.hero.taglineJa, { x: cx, y: y + 168, size: 20, anchor: 'middle', ls: 1, color: t.text2 });
  b += text(C.hero.taglineEn, { x: cx, y: y + 200, size: 17, anchor: 'middle', ls: 1, color: t.text2 });
  return { b, y: y + 222 };
}

// The icon row. Each icon is its own slice of the card so it can carry a link.
const ROW = { d: 48, slot: 64, h: 80 };
async function links(doc, y) {
  const t = doc.t, n = C.contacts.length, x0 = (W - n * ROW.slot) / 2;
  const icons = [];
  for (const [i, c] of C.contacts.entries()) {
    const sx = x0 + i * ROW.slot, x = sx + (ROW.slot - ROW.d) / 2, iy = y + (ROW.h - ROW.d) / 2 - 4;
    let b = doc.card({ x, y: iy, w: ROW.d, h: ROW.d, r: ROW.d / 2 });
    b += await icon(c.icon, x + ROW.d / 2 - 10, iy + ROW.d / 2 - 10, 20, t.tagText);
    icons.push({ c, b, box: [sx, y, ROW.slot, ROW.h] });
  }
  return { icons, x0, y: y + ROW.h };
}

function title(doc, y, label) {
  const t = doc.t;
  const g = doc.linear([[0, [t.accent, 1]], [1, [t.violet, 1]]]);
  const b = text(label, { x: W / 2, y: y + 30, size: 26, weight: 700, anchor: 'middle', color: t.text })
    + `<rect x="${W / 2 - 20}" y="${y + 44}" width="40" height="4" rx="2" fill="${g}"/>`;
  return { b, y: y + 80 };
}

async function about(doc, y0) {
  const t = doc.t, leftW = 290;
  const rightX = PAD + leftW + 10, rightW = PAD + CW - 40 - rightX;
  const bioSize = 16.5, bioLH = 31;
  const bio = C.about.bio.map((p) => wrap(p, bioSize, rightW));
  const bioH = bio.reduce((n, lines) => n + lines.length * bioLH, 0) + (bio.length - 1) * 10;
  const itemW = leftW - 60;
  const items = C.about.items.map((it) => ({ ...it, lines: wrap(it.value, 15, itemW - 36) }));
  const itemsH = items.reduce((n, it) => n + 46 + it.lines.length * 22, 0) + (items.length - 1) * 12;
  const ch = Math.max(36 + 124 + 44 + 28 + 26 + itemsH + 36, bioH + 80);

  let b = doc.card({ x: PAD, y: y0, w: CW, h: ch, r: 32 });
  const lcx = PAD + leftW / 2;
  let y = y0 + 36;
  const av = await imageData(C.about.avatar);
  const clip = doc.id('c');
  doc.defs.push(`<clipPath id="${clip}"><circle cx="${lcx}" cy="${y + 62}" r="57"/></clipPath>`);
  b += `<circle cx="${lcx}" cy="${y + 62}" r="62" ${fill(t.glassSubtle)} ${stroke(t.border)}/>`
    + `<image href="${av}" x="${lcx - 57}" y="${y + 5}" width="114" height="114" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`;
  y += 124 + 44;
  b += text(C.about.name, { x: lcx, y, size: 28, weight: 700, ls: 0.5, anchor: 'middle', color: t.text });
  y += 28;
  b += text(C.about.role, { x: lcx, y, size: 14.5, anchor: 'middle', color: t.text2 });
  y += 26;
  for (const it of items) {
    const ih = 46 + it.lines.length * 22, ix = lcx - itemW / 2;
    b += `<rect x="${ix}" y="${y}" width="${itemW}" height="${ih}" rx="16" ${fill(t.glassSubtle)} ${stroke(t.border)}/>`;
    b += text(it.label, { x: ix + 18, y: y + 27, size: 12.5, weight: 700, ls: 1.5, color: t.accentText });
    it.lines.forEach((line, i) => { b += text(line, { x: ix + 18, y: y + 51 + i * 22, size: 15, color: t.text }); });
    y += ih + 12;
  }
  y = y0 + (ch - bioH) / 2 + bioSize * 0.95 + (bioLH - bioSize) / 2;
  for (const lines of bio) {
    for (const line of lines) { b += text(line, { x: rightX, y, size: bioSize, ls: 0.3, color: t.text }); y += bioLH; }
    y += 10;
  }
  return { b, y: y0 + ch + 48 };
}

async function music(doc, y0, data, images) {
  const t = doc.t;
  const artists = data.artists.slice(0, 5), tracks = data.tracks.slice(0, 5);
  const gap = 14, aw = (CW - (artists.length - 1) * gap) / artists.length, ah = 132;
  let b = '';
  artists.forEach((a, i) => {
    const x = PAD + i * (aw + gap), y = y0;
    b += doc.card({ x, y, w: aw, h: ah, r: 22 });
    const cx = x + aw / 2, cy = y + 16 + 38, clip = doc.id('c');
    doc.defs.push(`<clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="38"/></clipPath>`);
    b += `<circle cx="${cx}" cy="${cy}" r="38" ${fill(t.glassSubtle)}/>`;
    if (images.get(a.image)) b += `<image href="${images.get(a.image)}" x="${cx - 38}" y="${cy - 38}" width="76" height="76" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`;
    b += text(truncate(a.name, 14, aw - 20), { x: cx, y: y + ah - 18, size: 14, weight: 700, anchor: 'middle', color: t.text });
  });

  const tY = y0 + ah + gap, rowH = 50, tH = 44 + (tracks.length - 1) * rowH + 38 + 18;
  b += doc.card({ x: PAD, y: tY, w: CW, h: tH, r: 22 });
  b += text('Top Tracks', { x: PAD + 22, y: tY + 30, size: 15, weight: 700, ls: 1, color: t.text });
  b += await icon('spotify', PAD + 22 + measure('Top Tracks', 15, 1) + 8, tY + 17, 16, '#1db954');
  b += text(`更新 ${jstDate(data.updatedAt)}`, { x: PAD + CW - 22, y: tY + 30, size: 12.5, anchor: 'end', color: t.muted });
  for (const [i, tr] of tracks.entries()) {
    const y = tY + 44 + i * rowH;
    if (i) b += `<rect x="${PAD + 22}" y="${y - 6}" width="${CW - 44}" height="1" ${fill(t.cardBorder)}/>`;
    b += text(String(i + 1), { x: PAD + 32, y: y + 24, size: 15, weight: 700, anchor: 'middle', color: t.muted });
    const clip = doc.id('c');
    doc.defs.push(`<clipPath id="${clip}"><rect x="${PAD + 52}" y="${y}" width="38" height="38" rx="8"/></clipPath>`);
    b += `<rect x="${PAD + 52}" y="${y}" width="38" height="38" rx="8" ${fill(t.glassSubtle)}/>`;
    if (images.get(tr.image)) b += `<image href="${images.get(tr.image)}" x="${PAD + 52}" y="${y}" width="38" height="38" clip-path="url(#${clip})"/>`;
    const artist = truncate(tr.artists, 13.5, 220), aW = measure(artist, 13.5);
    b += text(truncate(tr.name, 15, CW - 44 - 64 - aW - 30), { x: PAD + 104, y: y + 25, size: 15, weight: 700, color: t.text });
    b += text(artist, { x: PAD + CW - 22, y: y + 25, size: 13.5, anchor: 'end', color: t.text2 });
  }
  return { b, y: tY + tH + 48 };
}

function github(doc, y0, data) {
  const t = doc.t, gap = 14, tileW = (CW - 3 * gap) / 4, tileH = 96;
  const tt = data.totals;
  // Same tiles as the site: repository count (public + private), or Issues if there is none.
  const repos = (tt.publicRepos || 0) + (tt.privateRepos || 0);
  const tiles = [
    ['コントリビューション', tt.contributions],
    ['コミット', tt.commits],
    ['プルリクエスト', tt.pullRequests],
    repos > 0 ? ['リポジトリ', repos] : ['Issue', tt.issues],
  ];
  let b = '';
  tiles.forEach(([label, value, note], i) => {
    const x = PAD + i * (tileW + gap), y = y0;
    b += doc.card({ x, y, w: tileW, h: tileH, r: 22 });
    const v = value.toLocaleString('ja-JP');
    b += text(v, { x: x + 20, y: y + 46, size: 32, weight: 700, color: doc.textGradient(x + 20, measure(v, 32), [[0, t.text], [1, t.accent]]) });
    b += text(label, { x: x + 20, y: y + 71, size: 13.5, color: t.text2 });
    if (note) b += text(note, { x: x + 20, y: y + 88, size: 12.5, color: t.muted });
  });

  const ly = y0 + tileH + gap, lh = 96, lx0 = PAD + 22, bw = CW - 44;
  b += doc.card({ x: PAD, y: ly, w: CW, h: lh, r: 22 });
  b += text('Languages', { x: lx0, y: ly + 31, size: 15, weight: 700, ls: 1, color: t.text });
  b += text('All time', { x: lx0 + measure('Languages', 15, 1) + 8, y: ly + 31, size: 12, ls: 1, upper: true, color: t.muted });
  b += text(`数値は直近 1 年 · 更新 ${jstDate(data.updatedAt)}`, { x: lx0 + bw, y: ly + 31, size: 12.5, anchor: 'end', color: t.muted });
  // Percentages are out of every language, like the site, even though only the top 6 are drawn.
  const sum = data.languages.reduce((n, l) => n + l.commits, 0) || 1;
  const langs = data.languages.slice(0, 6);
  const by = ly + 46, clip = doc.id('c');
  doc.defs.push(`<clipPath id="${clip}"><rect x="${lx0}" y="${by}" width="${bw}" height="10" rx="5"/></clipPath>`);
  b += `<g clip-path="url(#${clip})"><rect x="${lx0}" y="${by}" width="${bw}" height="10" ${fill(t.heat[0])}/>`;
  let bx = lx0;
  for (const l of langs) {
    const w = (bw * l.commits) / sum;
    b += `<rect x="${bx.toFixed(1)}" y="${by}" width="${Math.max(0, w - 2).toFixed(1)}" height="10" fill="${l.color || t.muted}"/>`;
    bx += w;
  }
  b += '</g>';
  let lx = lx0;
  for (const l of langs) {
    const label = `${l.name} ${Math.round((l.commits / sum) * 100)}%`, w = 14 + measure(label, 13.5);
    if (lx + w > lx0 + bw) break;
    b += `<circle cx="${lx + 5}" cy="${ly + 75}" r="5" fill="${l.color || t.muted}"/>`;
    b += text(label, { x: lx + 14, y: ly + 79.5, size: 13.5, color: t.text2 });
    lx += w + 22;
  }
  return { b, y: ly + lh + 40 };
}

/* ---------- The whole card ---------- */

// Lays out the whole card, then cuts it into slices: everything above the icon row,
// one slice per icon (and the two ends of the row), and everything below.
async function profile(t, gh, mu, images) {
  const doc = new Doc(t, W, 0, { title: `${C.hero.name} — ${C.hero.taglineJa}` });
  const parts = []; // { b, y0, y1 } — kept in each slice they overlap (with room for shadows)
  const add = (y0, r) => { parts.push({ b: r.b, y0, y1: r.y }); return r.y; };
  let y = add(0, hero(doc, 0));
  const row = await links(doc, y);
  for (const ic of row.icons) parts.push({ b: ic.b, y0: ic.box[1], y1: ic.box[1] + ic.box[3], x0: ic.box[0], x1: ic.box[0] + ic.box[2] });
  const rowY = y;
  y = row.y + 8;
  y = add(y, title(doc, y, 'About Me'));
  y = add(y, await about(doc, y));
  if (mu) { y = add(y, title(doc, y, 'On Repeat')); y = add(y, await music(doc, y, mu, images)); }
  if (gh) { y = add(y, title(doc, y, 'GitHub')); y = add(y, github(doc, y, gh)); }
  parts.push({ b: text(`© ${new Date().getFullYear()} yuna1107 · yuna1107.com`, { x: W / 2, y: y + 4, size: 13, anchor: 'middle', color: t.text2 }), y0: y - 20, y1: y + 10 });
  const H = Math.round(y + 36);
  doc.h = H;

  const clip = doc.id('c');
  doc.defs.push(`<clipPath id="${clip}"><rect width="${W}" height="${H}" rx="28"/></clipPath>`);
  const backdrop = doc.backdrop(W, H);
  const frame = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="27.5" fill="none" ${stroke(t.cardBorder)}/>`;
  const slices = [
    { id: 'top', vb: [0, 0, W, rowY] },
    { id: 'row-start', vb: [0, rowY, row.x0, ROW.h] },
    ...row.icons.map((ic) => ({ id: `row-${ic.c.id}`, vb: ic.box, link: ic.c })),
    { id: 'row-end', vb: [W - row.x0, rowY, row.x0, ROW.h] },
    { id: 'bottom', vb: [0, rowY + ROW.h, W, H - rowY - ROW.h] },
  ];
  const M = 32; // shadow reach
  for (const sl of slices) {
    const [vx, vy, vw, vh] = sl.vb;
    const inside = parts.filter((p) => p.y1 + M > vy && p.y0 - M < vy + vh
      && (p.x0 == null || (p.x1 + M > vx && p.x0 - M < vx + vw)));
    const body = `<g clip-path="url(#${clip})">${backdrop}${inside.map((p) => p.b).join('')}</g>${frame}`;
    await writeFile(path.join(OUT, `profile-${sl.id}-${t.name}.svg`), await doc.render(body, sl.vb, sl.link ? sl.link.label : doc.title));
  }
  return { slices, W };
}

/* ---------- README ---------- */

// Slices sit edge to edge with no whitespace. align="top" removes the gap under each
// line of images, and widths are rounded down a hair so a row never wraps.
function readme(layout) {
  const alt = [`${C.hero.name} — ${C.hero.taglineJa} / ${C.hero.taglineEn}`, C.about.role, ...C.about.bio].join(' ');
  const pct = (w) => `${Math.floor((w / layout.W) * 1e6) / 1e4}%`;
  const html = layout.slices.map((sl) => {
    const name = `./assets/profile-${sl.id}`;
    const label = sl.link ? sl.link.label : sl.id === 'top' ? alt : '';
    const pic = `<picture><source media="(prefers-color-scheme: dark)" srcset="${name}-dark.svg"><img src="${name}-light.svg" alt="${esc(label)}" width="${pct(sl.vb[2])}" align="top"></picture>`;
    return sl.link ? `<a href="${sl.link.href}" title="${esc(sl.link.label)}">${pic}</a>` : pic;
  }).join('');
  return ['<div align="center">', '', html, '', '</div>', ''].join('\n');
}

/* ---------- Main ---------- */

await mkdir(OUT, { recursive: true });
await mkdir(CACHE, { recursive: true });
const [gh, mu] = await Promise.all([fetchJson('github', C.API.github), fetchJson('music', C.API.music)]);

const scriptText = (await readFile(new URL(import.meta.url), 'utf8')) + (await readFile(new URL('./content.mjs', import.meta.url), 'utf8'));
await loadMetrics(scriptText + JSON.stringify(gh.data ?? {}) + JSON.stringify(mu.data ?? {}) + '0123456789,:/.-…©');

// Spotify images are embedded; artist photos use the 160px size.
const images = new Map();
if (mu.data) {
  const small = (u) => u?.replace(/ab6761610000(5174|e5eb)/, 'ab6761610000f178');
  await Promise.all([...mu.data.artists.slice(0, 5), ...mu.data.tracks.slice(0, 5)].map(async (x) => {
    if (x.image) images.set(x.image, (await remoteImage(small(x.image))) ?? (await remoteImage(x.image)));
  }));
}

let layout;
for (const t of Object.values(THEMES)) layout = await profile(t, gh.data, mu.data, images);

// Remove cards from older layouts.
for (const f of await readdir(OUT)) if (!/^profile-[a-z0-9-]+-(light|dark)\.svg$/.test(f)) await rm(path.join(OUT, f));
await writeFile(path.join(ROOT, 'README.md'), readme(layout));
const state = (r) => (r.data ? (r.fresh ? 'fresh' : 'cached') : 'none');
console.log(`built profile card (github: ${state(gh)}, music: ${state(mu)})`);
