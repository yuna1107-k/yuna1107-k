// Builds the profile README and its light/dark SVG cards in the style of yuna1107.com.
// Usage: node scripts/build.mjs
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import * as C from './content.mjs';
import {
  ROOT, THEMES, Doc, text, icon, measure, wrap, truncate, imageData, remoteImage, loadMetrics, fill, stroke, esc,
} from './lib.mjs';

const OUT = path.join(ROOT, 'assets');
const W = 880; // full-width card width
const written = new Set();

async function save(name, theme, svg) {
  await writeFile(path.join(OUT, `${name}-${theme.name}.svg`), svg);
  written.add(name);
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn(`! ${url}: ${e.message} (keeping previous cards)`);
    return null;
  }
}

const textGrad = (doc, x, w) => doc.textGradient(x, w, [[0.2, doc.t.text], [0.6, doc.t.accent], [1, doc.t.violet]]);

/* ---------- Hero ---------- */

async function hero(t) {
  const H = 320;
  const doc = new Doc(t, W, H, { title: `${C.hero.name} — ${C.hero.taglineJa}`, animate: true });
  const clip = doc.id('c');
  doc.defs.push(`<clipPath id="${clip}"><rect width="${W}" height="${H}" rx="28"/></clipPath>`);
  let b = `<g clip-path="url(#${clip})">${doc.backdrop(W, H)}`;

  // Header bar
  b += `<rect width="${W}" height="62" ${fill(t.header)}/><rect y="61" width="${W}" height="1" ${fill(t.cardBorder)}/>`;
  b += text(C.hero.name, { x: 30, y: 39, size: 21, weight: 700, ls: 0.5, color: t.text });
  let x = W - 26 - 40;
  b += `<circle cx="${x + 20}" cy="31" r="20" ${fill(t.glassSubtle)} ${stroke(t.border)}/>`;
  b += await icon('moon', x + 12, 23, 16, t.text2);
  x -= 14;
  for (const name of ['envelope', 'x-twitter', 'github']) {
    x -= 18;
    b += await icon(name, x, 22, 18, t.text2);
    x -= 16;
  }
  x -= 6;
  for (const label of [...C.hero.nav].reverse()) {
    const w = measure(label, 15);
    x -= w;
    b += text(label, { x, y: 36, size: 15, weight: 700, color: t.text2 });
    x -= 28;
  }

  // Title block
  const cx = W / 2;
  const tw = measure(C.hero.name, 76);
  b += text(C.hero.name, { x: cx, y: 188, size: 76, weight: 700, anchor: 'middle', ls: -0.5, color: textGrad(doc, cx - tw / 2, tw) });
  b += text(C.hero.taglineJa, { x: cx, y: 240, size: 20, anchor: 'middle', ls: 1, color: t.text2 });
  b += text(C.hero.taglineEn, { x: cx, y: 272, size: 17, anchor: 'middle', ls: 1, color: t.text2 });
  b += `</g><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="27.5" fill="none" ${stroke(t.cardBorder)}/>`;
  await save('hero', t, await doc.render(b));
}

/* ---------- Section titles ---------- */

async function sectionTitle(t, label) {
  const H = 72;
  const doc = new Doc(t, W, H, { title: label });
  const g = doc.linear([[0, [t.accent, 1]], [1, [t.violet, 1]]]);
  const b = text(label, { x: W / 2, y: 40, size: 26, weight: 700, anchor: 'middle', color: t.text })
    + `<rect x="${W / 2 - 20}" y="54" width="40" height="4" rx="2" fill="${g}"/>`;
  await save(`title-${label.toLowerCase().replace(/\s+/g, '-')}`, t, await doc.render(b));
}

/* ---------- About ---------- */

async function about(t) {
  const m = 16, cw = W - 2 * m, leftW = 310;
  const rightX = m + leftW + 10, rightW = W - m - 46 - rightX;
  const bioSize = 17, bioLH = 32;
  const bio = C.about.bio.map((p) => wrap(p, bioSize, rightW));
  const bioH = bio.reduce((n, lines) => n + lines.length * bioLH, 0) + (bio.length - 1) * 10;

  const itemW = leftW - 64;
  const items = C.about.items.map((it) => ({ ...it, lines: wrap(it.value, 15, itemW - 36) }));
  const itemsH = items.reduce((n, it) => n + 44 + it.lines.length * 22, 0) + (items.length - 1) * 12;
  const leftH = 40 + 132 + 46 + 30 + 28 + itemsH + 40;
  const ch = Math.max(leftH, bioH + 80);
  const H = ch + 8 + 40;

  const doc = new Doc(t, W, H, { title: `About Me — ${C.about.name}` });
  let b = doc.frosted({ x: m, y: 8, w: cw, h: ch, r: 32 });
  const lcx = m + leftW / 2;
  let y = 8 + 40;

  // Avatar
  const av = await imageData(C.about.avatar);
  const clip = doc.id('c');
  doc.defs.push(`<clipPath id="${clip}"><circle cx="${lcx}" cy="${y + 66}" r="61"/></clipPath>`);
  b += `<circle cx="${lcx}" cy="${y + 66}" r="66" ${fill(t.glassSubtle)} ${stroke(t.border)} filter="url(#${doc.shadowFilter()})"/>`
    + `<image href="${av}" x="${lcx - 61}" y="${y + 5}" width="122" height="122" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`;
  y += 132 + 46;
  b += text(C.about.name, { x: lcx, y, size: 29, weight: 700, ls: 0.5, anchor: 'middle', color: t.text });
  y += 30;
  b += text(C.about.role, { x: lcx, y, size: 15, anchor: 'middle', color: t.text2 });
  y += 28;
  for (const it of items) {
    const ih = 44 + it.lines.length * 22;
    const ix = lcx - itemW / 2;
    b += `<rect x="${ix}" y="${y}" width="${itemW}" height="${ih}" rx="16" ${fill(t.glassSubtle)} ${stroke(t.border)}/>`;
    b += text(it.label, { x: ix + 18, y: y + 26, size: 11.5, weight: 700, ls: 1.5, color: t.accent });
    it.lines.forEach((line, i) => { b += text(line, { x: ix + 18, y: y + 50 + i * 22, size: 15, color: t.text }); });
    y += ih + 12;
  }

  // Bio
  y = 8 + (ch - bioH) / 2 + bioSize * 0.95 + (bioLH - bioSize) / 2;
  for (const lines of bio) {
    for (const line of lines) { b += text(line, { x: rightX, y, size: bioSize, ls: 0.3, color: t.text }); y += bioLH; }
    y += 10;
  }
  await save('about', t, await doc.render(b));
}

/* ---------- Music ---------- */

async function music(t, data, images) {
  const m = 16, cw = W - 2 * m;
  const artists = data.artists.slice(0, 5), tracks = data.tracks.slice(0, 5);
  const gap = 14, aw = (cw - (artists.length - 1) * gap) / artists.length, ah = 132;
  const tY = 10 + ah + gap, rowH = 50, tH = 44 + (tracks.length - 1) * rowH + 38 + 18;
  const H = tY + tH + 26;
  const doc = new Doc(t, W, H, { title: 'Spotify: top artists and tracks' });
  let b = '';

  // Artists
  artists.forEach((a, i) => {
    const x = m + i * (aw + gap), y = 10;
    b += doc.frosted({ x, y, w: aw, h: ah, r: 22 });
    const cx = x + aw / 2, cy = y + 16 + 38;
    const clip = doc.id('c');
    doc.defs.push(`<clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="38"/></clipPath>`);
    b += `<circle cx="${cx}" cy="${cy}" r="38" ${fill(t.glassSubtle)}/>`;
    if (images.get(a.image)) b += `<image href="${images.get(a.image)}" x="${cx - 38}" y="${cy - 38}" width="76" height="76" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`;
    b += text(truncate(a.name, 13.5, aw - 20), { x: cx, y: y + ah - 18, size: 13.5, weight: 700, anchor: 'middle', color: t.text });
  });

  // Tracks: one panel, one line per track
  b += doc.frosted({ x: m, y: tY, w: cw, h: tH, r: 22 });
  b += text('Top Tracks', { x: m + 22, y: tY + 30, size: 15, weight: 700, ls: 1, color: t.text });
  b += await icon('spotify', m + 22 + measure('Top Tracks', 15, 1) + 8, tY + 17, 16, '#1db954');
  const updated = new Date(data.updatedAt || Date.now()).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  b += text(`更新 ${updated}`, { x: m + cw - 22, y: tY + 30, size: 11.5, anchor: 'end', color: t.muted });
  for (const [i, tr] of tracks.entries()) {
    const y = tY + 44 + i * rowH;
    if (i) b += `<rect x="${m + 22}" y="${y - 6}" width="${cw - 44}" height="1" ${fill(t.cardBorder)}/>`;
    b += text(String(i + 1), { x: m + 32, y: y + 24, size: 15, weight: 700, anchor: 'middle', color: t.muted });
    const clip = doc.id('c');
    doc.defs.push(`<clipPath id="${clip}"><rect x="${m + 52}" y="${y}" width="38" height="38" rx="8"/></clipPath>`);
    b += `<rect x="${m + 52}" y="${y}" width="38" height="38" rx="8" ${fill(t.glassSubtle)}/>`;
    if (images.get(tr.image)) b += `<image href="${images.get(tr.image)}" x="${m + 52}" y="${y}" width="38" height="38" clip-path="url(#${clip})"/>`;
    const artist = truncate(tr.artists, 13, 230);
    const aW = measure(artist, 13);
    b += text(truncate(tr.name, 15, cw - 44 - 64 - aW - 30), { x: m + 104, y: y + 25, size: 15, weight: 700, color: t.text });
    b += text(artist, { x: m + cw - 22, y: y + 25, size: 13, anchor: 'end', color: t.text2 });
  }
  await save('music', t, await doc.render(b));
}

/* ---------- GitHub ---------- */

async function githubCard(t, data) {
  const m = 16, cw = W - 2 * m, gap = 14, tileW = (cw - 3 * gap) / 4, tileH = 96;
  const langY = 10 + tileH + gap, langH = 96;
  const H = langY + langH + 26;
  const doc = new Doc(t, W, H, { title: `GitHub: ${data.totals.contributions} contributions in the last year` });
  let b = '';

  const tt = data.totals;
  const tiles = [
    ['コントリビューション', tt.contributions],
    ['コミット', tt.commits],
    ['プルリクエスト', tt.pullRequests],
    tt.private > 0 ? ['非公開リポジトリ', tt.private, '内訳は非公開'] : ['Issue', tt.issues],
  ];
  tiles.forEach(([label, value, note], i) => {
    const x = m + i * (tileW + gap), y = 10;
    b += doc.frosted({ x, y, w: tileW, h: tileH, r: 22 });
    const v = value.toLocaleString('ja-JP');
    b += text(v, { x: x + 20, y: y + 46, size: 32, weight: 700, color: doc.textGradient(x + 20, measure(v, 32), [[0, t.text], [1, t.accent]]) });
    b += text(label, { x: x + 20, y: y + 71, size: 13.5, color: t.text2 });
    if (note) b += text(note, { x: x + 20, y: y + 88, size: 11.5, color: t.muted });
  });

  // Languages: one stacked bar with a legend
  b += doc.frosted({ x: m, y: langY, w: cw, h: langH, r: 22 });
  const lx0 = m + 22, bw = cw - 44;
  b += text('Languages', { x: lx0, y: langY + 31, size: 15, weight: 700, ls: 1, color: t.text });
  b += text('All time', { x: lx0 + measure('Languages', 15, 1) + 8, y: langY + 31, size: 10.5, ls: 1, upper: true, color: t.muted });
  const updated = new Date(data.updatedAt || Date.now()).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  b += text(`数値は直近 1 年 · 更新 ${updated}`, { x: lx0 + bw, y: langY + 31, size: 11.5, anchor: 'end', color: t.muted });

  const langs = data.languages.slice(0, 6);
  const sum = langs.reduce((n, l) => n + l.commits, 0) || 1;
  const by = langY + 46, clip = doc.id('c');
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
    const label = `${l.name} ${Math.round((l.commits / sum) * 100)}%`;
    const w = 14 + measure(label, 13);
    if (lx + w > lx0 + bw) break;
    b += `<circle cx="${lx + 5}" cy="${langY + 75}" r="5" fill="${l.color || t.muted}"/>`;
    b += text(label, { x: lx + 14, y: langY + 79.5, size: 13, color: t.text2 });
    lx += w + 24;
  }
  await save('github', t, await doc.render(b));
}

/* ---------- Links ---------- */

const LINK = { W: 76, H: 80, d: 52 };
async function iconLink(t, c, i, count) {
  const x = (LINK.W - LINK.d) / 2, y = 8;
  const doc = new Doc(t, LINK.W, LINK.H, { title: `${c.label}: ${c.value}` });
  let b = doc.frosted({ x, y, w: LINK.d, h: LINK.d, r: LINK.d / 2, vx: x + i * LINK.W, vy: y, VW: count * LINK.W, VH: 160 });
  b += await icon(c.icon, x + LINK.d / 2 - 11, y + LINK.d / 2 - 11, 22, t.tagText);
  await save(`link-${c.id}`, t, await doc.render(b));
}

/* ---------- README ---------- */

const pic = (name, alt, width) => `<picture><source media="(prefers-color-scheme: dark)" srcset="./assets/${name}-dark.svg"><img src="./assets/${name}-light.svg" alt="${esc(alt)}"${width ? ` width="${width}"` : ''}></picture>`;
const link = (href, inner) => (href ? `<a href="${href}" title="${esc(href.replace(/^mailto:/, ''))}">${inner}</a>` : inner);

function readme(has) {
  const L = [];
  L.push('<div align="center">', '');
  L.push(link(C.SITE, pic('hero', `${C.hero.name} — ${C.hero.taglineJa} / ${C.hero.taglineEn}`, '100%')), '');
  L.push(C.contacts.map((c) => link(c.href, pic(`link-${c.id}`, c.label, 64))).join(''), '');
  L.push(pic('title-about-me', 'About Me', '100%'), '');
  L.push(pic('about', [C.about.name, C.about.role, ...C.about.items.map((i) => `${i.label}: ${i.value}`), ...C.about.bio].join(' / '), '100%'), '');
  if (has.music) {
    L.push(pic('title-music', 'Music', '100%'), '');
    L.push(link(`${C.SITE}/#activity`, pic('music', 'Spotify: top artists and tracks', '100%')), '');
  }
  if (has.github) {
    L.push(pic('title-github', 'GitHub', '100%'), '');
    L.push(pic('github', 'GitHub stats', '100%'), '');
  }
  L.push(`<sub>&copy; ${new Date().getFullYear()} yuna1107 · <a href="${C.SITE}">yuna1107.com</a></sub>`, '', '</div>', '');
  return L.join('\n');
}

/* ---------- Main ---------- */

await mkdir(OUT, { recursive: true });
const [gh, mu] = await Promise.all([fetchJson(C.API.github), fetchJson(C.API.music)]);

const scriptText = (await readFile(new URL(import.meta.url), 'utf8')) + (await readFile(new URL('./content.mjs', import.meta.url), 'utf8'));
await loadMetrics(scriptText + JSON.stringify(gh ?? {}) + JSON.stringify(mu ?? {}) + '0123456789,:/.-…');

// Spotify images are embedded; artist photos use the 160px size.
const images = new Map();
if (mu) {
  const small = (u) => u?.replace(/ab6761610000(5174|e5eb)/, 'ab6761610000f178');
  await Promise.all([...mu.artists.slice(0, 5), ...mu.tracks.slice(0, 5)].map(async (x) => {
    if (x.image) images.set(x.image, await remoteImage(small(x.image)) ?? await remoteImage(x.image));
  }));
}

for (const t of Object.values(THEMES)) {
  await hero(t);
  for (const [i, c] of C.contacts.entries()) await iconLink(t, c, i, C.contacts.length);
  for (const label of ['About Me', 'Music', 'GitHub']) await sectionTitle(t, label);
  await about(t);
  if (mu) await music(t, mu, images);
  if (gh) await githubCard(t, gh);
}

// Remove cards that are no longer used. Activity cards are kept when their API was unreachable.
const kept = { github: !gh, music: !mu };
for (const f of await readdir(OUT)) {
  const name = f.replace(/-(light|dark)\.svg$/, '');
  if (!written.has(name) && !kept[name]) await rm(path.join(OUT, f));
}
const files = await readdir(OUT);
await writeFile(path.join(ROOT, 'README.md'), readme({ github: files.includes('github-light.svg'), music: files.includes('music-light.svg') }));
console.log(`built ${written.size} cards (github: ${gh ? 'fresh' : 'cached'}, music: ${mu ? 'fresh' : 'cached'})`);
