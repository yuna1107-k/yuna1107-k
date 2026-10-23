// Shared SVG helpers: theme tokens, font subsetting/metrics, glass panels, text.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Design tokens from yuna1107.com scss/_tokens.scss. Colors are [hex, alpha].
export const THEMES = {
  light: {
    name: 'light',
    text: '#13263a', text2: '#3b5168', muted: '#4f667b',
    accent: '#0099ff', accentText: '#0062a8', violet: '#818cf8',
    glass: ['#ffffff', 0.6], glassStrong: ['#ffffff', 0.72], glassSubtle: ['#ffffff', 0.26],
    header: ['#f4faff', 0.62],
    border: ['#ffffff', 0.7], edge: ['#ffffff', 0.95], edgeLow: ['#ffffff', 0.35], sheen: ['#ffffff', 0.9],
    cardBorder: ['#13263a', 0.1],
    shadow: [['#184e80', 0.12, 6, 8], ['#184e80', 0.06, 1, 1.5]],
    tagBg: ['#0099ff', 0.13], tagText: '#0062a8',
    orbs: [['#38bdf8', 0.55], ['#818cf8', 0.42], ['#2dd4bf', 0.4], ['#f472b6', 0.3]],
    bg: [['#f3f9ff', 0], ['#e2f1fc', 0.45], ['#eaf0ff', 1]],
    heat: [['#13263a', 0.08], ['#bae6fd', 1], ['#7dd3fc', 1], ['#0ea5e9', 1], ['#0369a1', 1]],
  },
  dark: {
    name: 'dark',
    text: '#e6f3fd', text2: '#b0c3d4', muted: '#90a4b7',
    accent: '#38bdf8', accentText: '#5cc8f8', violet: '#818cf8',
    glass: ['#162036', 0.58], glassStrong: ['#18223a', 0.78], glassSubtle: ['#162036', 0.26],
    header: ['#060b16', 0.62],
    border: ['#ffffff', 0.12], edge: ['#ffffff', 0.22], edgeLow: ['#ffffff', 0.05], sheen: ['#ffffff', 0.32],
    cardBorder: ['#ffffff', 0.1],
    shadow: [['#000000', 0.4, 6, 9], ['#000000', 0.25, 1, 1.5]],
    tagBg: ['#38bdf8', 0.16], tagText: '#7dd3fc',
    orbs: [['#0ea5e9', 0.45], ['#6366f1', 0.4], ['#14b8a6', 0.28], ['#d946ef', 0.22]],
    bg: [['#04070f', 0], ['#071224', 0.5], ['#0b0a24', 1]],
    heat: [['#ffffff', 0.07], ['#0c4a6e', 1], ['#0369a1', 1], ['#0ea5e9', 1], ['#7dd3fc', 1]],
  },
};

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const fill = ([hex, a]) => `fill="${hex}"${a === 1 ? '' : ` fill-opacity="${a}"`}`;
export const stroke = ([hex, a], w = 1) => `stroke="${hex}"${a === 1 ? '' : ` stroke-opacity="${a}"`} stroke-width="${w}"`;
const r1 = (n) => Math.round(n * 10) / 10;

/* ---------- Fonts ---------- */

const FAMILY = 'Zen Kurenaido';
const UA_MODERN = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function get(url, headers = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res;
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function fetchFont(chars, modern) {
  const url = `https://fonts.googleapis.com/css2?family=${FAMILY.replace(/ /g, '+')}&text=${encodeURIComponent(chars)}`;
  const css = await (await get(url, modern ? { 'User-Agent': UA_MODERN } : {})).text();
  const m = css.match(/url\((https:[^)]+)\)/);
  if (!m) throw new Error('font url not found');
  return Buffer.from(await (await get(m[1])).arrayBuffer());
}

// Reads unitsPerEm, cmap and hmtx from a TrueType file so text can be measured.
function parseMetrics(buf) {
  const tables = {};
  for (let i = 0; i < buf.readUInt16BE(4); i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = buf.readUInt32BE(o + 8);
  }
  const upm = buf.readUInt16BE(tables.head + 18);
  const nHM = buf.readUInt16BE(tables.hhea + 34);
  const map = new Map();
  const c = tables.cmap;
  for (let i = 0; i < buf.readUInt16BE(c + 2); i++) {
    const pid = buf.readUInt16BE(c + 4 + i * 8);
    const st = c + buf.readUInt32BE(c + 8 + i * 8);
    const fmt = buf.readUInt16BE(st);
    if (fmt === 12) {
      for (let g = 0; g < buf.readUInt32BE(st + 12); g++) {
        const o = st + 16 + g * 12;
        const s = buf.readUInt32BE(o), e = buf.readUInt32BE(o + 4), gid = buf.readUInt32BE(o + 8);
        for (let cp = s; cp <= e; cp++) map.set(cp, gid + cp - s);
      }
    } else if (fmt === 4 && pid === 3) {
      const segX2 = buf.readUInt16BE(st + 6);
      const endO = st + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = buf.readUInt16BE(endO + 2 * s), start = buf.readUInt16BE(startO + 2 * s);
        const delta = buf.readInt16BE(deltaO + 2 * s), ro = buf.readUInt16BE(rangeO + 2 * s);
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
          let gid = ro === 0 ? (cp + delta) & 0xffff : buf.readUInt16BE(rangeO + 2 * s + ro + 2 * (cp - start));
          if (ro !== 0 && gid) gid = (gid + delta) & 0xffff;
          if (gid && !map.has(cp)) map.set(cp, gid);
        }
      }
    }
  }
  return (cp) => {
    const g = map.get(cp);
    return g == null ? null : buf.readUInt16BE(tables.hmtx + 4 * Math.min(g, nHM - 1)) / upm;
  };
}

let advance = null;
export async function loadMetrics(allText) {
  const chars = [...new Set(allText)].filter((ch) => ch.trim()).join('');
  advance = parseMetrics(await fetchFont(chars, false));
}

const isWide = (cp) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xffef);
export function measure(str, size, ls = 0) {
  let w = 0, n = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    w += advance?.(cp) ?? (ch === ' ' ? 0.25 : isWide(cp) ? 1 : 0.55);
    n++;
  }
  return w * size * 1.02 + ls * n;
}

export function truncate(str, size, maxW, ls = 0) {
  if (measure(str, size, ls) <= maxW) return str;
  const chars = [...str];
  while (chars.length && measure(chars.join('') + '…', size, ls) > maxW) chars.pop();
  return chars.join('').trimEnd() + '…';
}

// Line breaking: Latin words stay whole, CJK breaks anywhere, no closing punctuation at line start.
const NO_START = '、。，．,.)）」』】！？!?ー・ぁぃぅぇぉっゃゅょァィゥェォッャュョ';
export function wrap(str, size, maxW, ls = 0) {
  const tokens = str.match(/[^\s⺀-鿿＀-￯]+\s*|\s+|./gu) || [];
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    if (line && measure((line + tok).trimEnd(), size, ls) > maxW && !NO_START.includes(tok[0])) {
      lines.push(line.trimEnd());
      line = tok.trimStart();
    } else line += tok;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

const fontCache = new Map();
async function fontFaceFor(svgBody) {
  const texts = [...svgBody.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
    .join('');
  const chars = [...new Set(texts)].filter((ch) => ch.trim()).sort().join('');
  if (!chars) return '';
  if (!fontCache.has(chars)) fontCache.set(chars, (await fetchFont(chars, true)).toString('base64'));
  return `@font-face{font-family:'ZK';src:url(data:font/woff2;base64,${fontCache.get(chars)}) format('woff2');}`;
}

/* ---------- Images & icons ---------- */

export async function imageData(file) {
  const buf = await readFile(path.join(ROOT, 'src/images', file));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export async function remoteImage(url) {
  try {
    const res = await get(url);
    const type = res.headers.get('content-type') || 'image/jpeg';
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

const iconCache = new Map();
export async function loadIcon(name) {
  if (!iconCache.has(name)) {
    const svg = await readFile(path.join(ROOT, 'src/icons', `${name}.svg`), 'utf8');
    iconCache.set(name, { viewBox: svg.match(/viewBox="([^"]+)"/)[1], d: svg.match(/ d="([^"]+)"/)[1] });
  }
  return iconCache.get(name);
}
export async function icon(name, x, y, size, color) {
  const { viewBox, d } = await loadIcon(name);
  return `<svg x="${r1(x)}" y="${r1(y)}" width="${size}" height="${size}" viewBox="${viewBox}"><path d="${d}" ${fill(Array.isArray(color) ? color : [color, 1])}/></svg>`;
}

/* ---------- Document ---------- */

export class Doc {
  constructor(theme, w, h, { title = '', animate = false } = {}) {
    Object.assign(this, { t: theme, w, h, title, animate, defs: [], n: 0, shared: new Set() });
  }

  id(prefix) { return `${prefix}${++this.n}`; }

  once(key, markup) {
    if (!this.shared.has(key)) { this.shared.add(key); this.defs.push(markup); }
    return key;
  }

  linear(stops, { x1 = 0, y1 = 0, x2 = 1, y2 = 0, user = false } = {}) {
    const id = this.id('g');
    const units = user ? ' gradientUnits="userSpaceOnUse"' : '';
    this.defs.push(`<linearGradient id="${id}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"${units}>${
      stops.map(([o, [c, a]]) => `<stop offset="${o}" stop-color="${c}"${a === 1 ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`);
    return `url(#${id})`;
  }

  // Gradient for text like the site's h1 / stat values, spanning the measured text box.
  textGradient(x, w, stops) {
    return this.linear(stops.map(([o, c]) => [o, [c, 1]]), { x1: x, x2: x + w, user: true });
  }

  shadowFilter() {
    const [[c1, a1, dy1, b1], [c2, a2, dy2, b2]] = this.t.shadow;
    return this.once('sh', `<filter id="sh" x="-25%" y="-25%" width="150%" height="170%">
<feDropShadow dx="0" dy="${dy1}" stdDeviation="${b1}" flood-color="${c1}" flood-opacity="${a1}"/>
<feDropShadow dx="0" dy="${dy2}" stdDeviation="${b2}" flood-color="${c2}" flood-opacity="${a2}"/></filter>`);
  }

  // The page backdrop: soft gradient and colored orbs laid out like the site's .site-backdrop.
  // A tall canvas repeats the layout every "screen" so the orbs run the full length.
  backdrop(VW, VH) {
    const t = this.t;
    this.once('bg', `<linearGradient id="bg" x1="0.33" y1="0" x2="0.67" y2="1">${
      t.bg.map(([c, o]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`);
    t.orbs.forEach(([c, a], i) => this.once(`orb${i}`,
      `<radialGradient id="orb${i}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="0.65" stop-color="${c}" stop-opacity="0"/></radialGradient>`));
    const S = Math.min(VH, VW * 0.75), v = Math.max(VW, S) / 100;
    let out = `<rect width="${VW}" height="${VH}" fill="url(#bg)"/>`;
    for (let k = 0; k * S < VH; k++) {
      const oy = k * S;
      const orbs = [
        [10 * v, 6 * v, 40 * v],
        [VW - 3 * v, 0.04 * S + 33 * v, 33 * v],
        [0.1 * VW + 30 * v, S + 2 * v, 30 * v],
        [4 * v, 0.4 * S + 22 * v, 22 * v],
      ];
      out += orbs.map(([cx, cy, r], i) =>
        `<g class="orb orb${i + 1}"><circle cx="${r1(cx)}" cy="${r1(oy + cy)}" r="${r1(r)}" fill="url(#orb${(i + k) % 4})"/></g>`).join('');
    }
    return out;
  }

  // Glass edges: thin border, top highlight and diagonal sheen like the site's glass mixins.
  glassEdges({ x, y, w, h, r }) {
    const t = this.t;
    const edge = this.once('edge', `<linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.edge[0]}" stop-opacity="${t.edge[1]}"/><stop offset="0.14" stop-color="${t.edge[0]}" stop-opacity="0"/><stop offset="0.9" stop-color="${t.edgeLow[0]}" stop-opacity="0"/><stop offset="1" stop-color="${t.edgeLow[0]}" stop-opacity="${t.edgeLow[1]}"/></linearGradient>`);
    const sheen = this.once('sheen', `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.sheen[0]}" stop-opacity="${t.sheen[1]}"/><stop offset="0.32" stop-color="${t.sheen[0]}" stop-opacity="0"/><stop offset="0.68" stop-color="${t.sheen[0]}" stop-opacity="0"/><stop offset="1" stop-color="${t.sheen[0]}" stop-opacity="${t.sheen[1]}"/></linearGradient>`);
    const box = `x="${r1(x + 0.5)}" y="${r1(y + 0.5)}" width="${r1(w - 1)}" height="${r1(h - 1)}" rx="${r - 0.5}"`;
    return `<rect ${box} fill="none" ${stroke(t.border)}/>`
      + `<rect x="${r1(x + 1.5)}" y="${r1(y + 1.5)}" width="${r1(w - 3)}" height="${r1(h - 3)}" rx="${r - 1.5}" fill="none" stroke="url(#${edge})" stroke-width="1"/>`
      + `<rect ${box} fill="none" stroke="url(#${sheen})" stroke-width="1" opacity="0.8"/>`;
  }

  // Glass card on top of the backdrop, with a drop shadow that stays outside the card.
  card({ x, y, w, h, r, glass = 'glass' }) {
    const mask = this.id('m');
    const box = `x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r}"`;
    this.defs.push(`<mask id="${mask}" maskUnits="userSpaceOnUse" x="${r1(x - 40)}" y="${r1(y - 40)}" width="${r1(w + 80)}" height="${r1(h + 90)}"><rect x="${r1(x - 40)}" y="${r1(y - 40)}" width="${r1(w + 80)}" height="${r1(h + 90)}" fill="#fff"/><rect ${box} fill="#000"/></mask>`);
    return `<g mask="url(#${mask})"><rect ${box} fill="${this.t.bg[1][0]}" filter="url(#${this.shadowFilter()})"/></g>` + this.glass({ x, y, w, h, r, glass });
  }

  // Glass on top of a backdrop that is already drawn.
  glass({ x, y, w, h, r, glass = 'glass' }) {
    return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r}" ${fill(this.t[glass])}/>` + this.glassEdges({ x, y, w, h, r });
  }

  async render(body) {
    const anim = this.animate ? `
.orb{animation:drift 22s ease-in-out infinite alternate}
.orb2{animation-duration:26s;animation-direction:alternate-reverse}
.orb3{animation-duration:30s}
.orb4{animation-duration:18s;animation-direction:alternate-reverse}
@keyframes drift{0%{transform:translate(0,0)}50%{transform:translate(36px,-22px)}100%{transform:translate(-28px,26px)}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.orb,.pulse{animation:none}}` : '';
    const font = await fontFaceFor(body);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-label="${esc(this.title)}">
<title>${esc(this.title)}</title>
<style>${font}
text{font-family:'ZK','Zen Kurenaido','Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif}${anim}</style>
<defs>${this.defs.join('\n')}</defs>
${body}
</svg>
`;
  }
}

export function text(str, { x, y, size, color, weight = 400, anchor = 'start', ls = 0, opacity, upper = false }) {
  const s = upper ? str.toUpperCase() : str;
  const c = Array.isArray(color) ? color : [color, 1];
  const fillAttr = c[0].startsWith('url(') ? `fill="${c[0]}"` : fill(c);
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}${opacity != null ? ` opacity="${opacity}"` : ''} ${fillAttr}>${esc(s)}</text>`;
}
