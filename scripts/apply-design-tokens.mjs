#!/usr/bin/env node
// Rewrites literal colours, corner radii and font sizes in src/ onto the scale in
// src/constants/theme.ts, and adds borderCurve: 'continuous' next to every radius.
// Idempotent: run it again after adding screens. `node scripts/apply-design-tokens.mjs --check` lists
// what it would change without writing.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { color, CATEGORY_COLORS, radius, font } from '../src/constants/theme.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const C = color;
const cat = CATEGORY_COLORS;

// Old literal → theme colour. Accent splits, the green-grey and Chakra grey families,
// Tailwind violet/red leftovers and the old peach sign-up screen.
const COLOR_MAP = {
  // accent splits and green text/fills → the one accent
  '#17765D': C.accent, '#277B62': C.accent, '#207C63': C.accent, '#176C57': C.accent,
  '#206C57': C.accent, '#24745F': C.accent, '#287D68': C.accent, '#22A07D': C.accent,
  '#3E9D78': C.accent, '#3D8B70': C.accent, '#36735D': C.accent, '#3B8169': C.accent,
  '#2E594A': C.accent, '#285545': C.accent, '#4F8D75': C.accent, '#72A38E': C.accent,
  '#145743': C.accentEdge, '#185842': C.accentEdge,
  // pale mint fills → accent tint / screen bg
  '#DFF2E9': C.accentTint, '#E5F3EC': C.accentTint, '#E6F4ED': C.accentTint, '#E7F5EE': C.accentTint,
  '#E8F4EE': C.accentTint, '#D9F2E7': C.accentTint, '#DFF2EE': C.accentTint, '#ECFDF5': C.accentTint,
  '#FDE6D7': C.accentTint,
  '#F2FAF6': C.bg, '#F4FBF8': C.bg, '#F5FAF7': C.bg, '#FFF7F1': C.bg,
  // saturated mint borders → accent tint edge
  '#9FD8C5': C.accentTintEdge, '#BFDED5': C.accentTintEdge, '#BFE6D9': C.accentTintEdge,
  '#C4E6D8': C.accentTintEdge, '#C6E5D7': C.accentTintEdge, '#C7E9DC': C.accentTintEdge,
  '#D7EDE6': C.accentTintEdge, '#D8EDE4': C.accentTintEdge, '#BBF7D0': C.accentTintEdge,
  '#F6D6C3': C.accentTintEdge,
  // grey text (green-grey, Chakra, warm) → slate by darkness
  '#243B31': C.ink, '#263A31': C.ink, '#2C4036': C.ink, '#2D3748': C.ink, '#2E443A': C.ink,
  '#2F4339': C.ink, '#30463B': C.ink,
  '#334B40': C.inkSoft, '#344A40': C.inkSoft, '#354A40': C.inkSoft,
  '#40564C': C.inkMuted, '#43564D': C.inkMuted, '#43584E': C.inkMuted, '#475E53': C.inkMuted,
  '#4C6257': C.inkMuted, '#52685D': C.inkMuted, '#53675D': C.inkMuted, '#5B6B66': C.inkMuted,
  '#4B806C': C.muted, '#4F806B': C.muted, '#477361': C.muted, '#537164': C.muted, '#547366': C.muted,
  '#587366': C.muted, '#5B806F': C.muted, '#5E806F': C.muted, '#60746A': C.muted, '#61756B': C.muted,
  '#64756D': C.muted, '#64776D': C.muted, '#657B70': C.muted, '#66756E': C.muted, '#668074': C.muted,
  '#6C877A': C.muted, '#6F8278': C.muted, '#6F9A87': C.muted, '#71827A': C.muted, '#71847A': C.muted,
  '#74877E': C.muted, '#7A8982': C.muted, '#7B8E84': C.muted, '#6F756F': C.muted, '#7E897F': C.muted,
  '#806854': C.muted, '#8A9991': C.muted, '#8A9A92': C.muted, '#93A29A': C.muted, '#94A3B8': C.muted,
  '#96A49D': C.muted, '#98A69F': C.muted, '#9AA8A1': C.muted, '#9CA3AF': C.muted,
  // grey borders and fills → slate line / fill steps by lightness
  '#B7C9C0': C.line, '#B9C7C0': C.line, '#BFDCCF': C.line, '#C5D6CD': C.line, '#CAD7D1': C.line,
  '#CEE5DA': C.line, '#D2E0D9': C.line,
  '#CFE7DC': C.lineSoft, '#D3E2DA': C.lineSoft, '#D4E5DD': C.lineSoft, '#D5E2DC': C.lineSoft,
  '#D5E8DE': C.lineSoft, '#D6E9E0': C.lineSoft, '#D8E8E0': C.lineSoft, '#D9E7E0': C.lineSoft,
  '#DCE8E2': C.lineSoft, '#DCE9E3': C.lineSoft, '#DCEBE4': C.lineSoft, '#DDE7E1': C.lineSoft,
  '#DDE8E2': C.lineSoft, '#DDE9E3': C.lineSoft, '#DFE9E4': C.lineSoft, '#E0E9E4': C.lineSoft,
  '#E0EAE5': C.lineSoft, '#E5E5E5': C.lineSoft, '#E9E3DC': C.lineSoft, '#EDE6DC': C.lineSoft,
  '#F0DED1': C.lineSoft, '#EDF3F0': C.lineSoft,
  '#E6EFEA': C.fill, '#E8F1ED': C.fill, '#EEF3F0': C.fill, '#F2F4F3': C.fill,
  '#F8F5F0': C.fillSoft, '#F8FCFA': C.fillSoft, '#FCFFFD': C.fillSoft,
  // stray hues → the category or status colour they stand for
  '#6D28D9': cat.sleep.ink, '#7C3AED': cat.sleep.ink, '#8B5CF6': cat.sleep.ink, '#6F5DB2': cat.sleep.ink,
  '#F3E8FF': cat.sleep.bg, '#F5F3FF': cat.sleep.bg, '#EEEBFB': cat.sleep.bg, '#DDD6FE': cat.sleep.edge,
  '#B65478': cat.mind.ink, '#FBEAF0': cat.mind.bg, '#1CB0F6': cat.mind.ink,
  '#FF9600': cat.meal.ink, '#FFD9A8': cat.meal.edge, '#FFF4D9': cat.meal.bg, '#79612E': C.warn,
  '#B64646': C.danger, '#FFF0F0': C.dangerTint, '#F1CCCC': C.dangerEdge,
};

// Pictures keep their own colours / shapes (same list as designTokens.test.ts).
const SKIP_COLOR = ['RoomBackground.tsx', 'WorldBackdrop.tsx', 'NightOverlay.tsx', 'app/journey.tsx'];
const SKIP_RADIUS = ['RoomBackground.tsx', 'HatchEgg.tsx'];

const RADII = Object.values(radius).filter((r) => r < 999);
const SIZES = Object.values(font).filter((s) => s !== font.display);

// Nearest step; a tie goes to the larger one.
export function nearest(n, steps) {
  return steps.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) || (Math.abs(s - n) === Math.abs(best - n) && s > best) ? s : best));
}

// Text of the { } block that encloses `pos`, with nested objects (shadowOffset) removed.
function enclosingBlock(src, pos) {
  let depth = 0, start = pos, end = pos;
  for (; start > 0; start--) {
    const ch = src[start];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) break; depth--; }
  }
  depth = 0;
  for (; end < src.length; end++) {
    const ch = src[end];
    if (ch === '{') depth++;
    else if (ch === '}') { if (depth === 0) break; depth--; }
  }
  let body = src.slice(start + 1, end);
  while (/\{[^{}]*\}/.test(body)) body = body.replace(/\{[^{}]*\}/g, '');
  return { start, end, body };
}

export function mapRadius(n, prop, block) {
  if (n === 999 || n === 0) return n;
  const dims = [...block.matchAll(/(?<![A-Za-z])(?:width|height): *(\d+(?:\.\d+)?)\b/g)].map((m) => Number(m[1]));
  if (dims.length && n * 2 >= Math.min(...dims)) return 999; // a circle or pill
  if (n >= 30) return prop === 'borderRadius' ? 999 : radius.sheet;
  return nearest(n, RADII);
}

export function mapFont(n) {
  return n === font.display ? n : nearest(n, SIZES);
}

export function transform(src, rel) {
  let out = src;
  if (!SKIP_COLOR.some((s) => rel.endsWith(s))) {
    out = out.replace(/#[0-9A-Fa-f]{6}\b/g, (h) => COLOR_MAP[h.toUpperCase()] ?? h);
  }
  out = out.replace(/fontSize: *(\d+(?:\.\d+)?)/g, (_, n) => `fontSize: ${mapFont(Number(n))}`);
  if (SKIP_RADIUS.some((s) => rel.endsWith(s))) return out;
  // Radii: one pass from the end so earlier offsets stay valid.
  const hits = [...out.matchAll(/\b(border(?:Top|Bottom)?(?:Left|Right)?Radius): *(\d+(?:\.\d+)?)(,?)/g)].reverse();
  for (const m of hits) {
    const block = enclosingBlock(out, m.index);
    const value = mapRadius(Number(m[2]), m[1], block.body);
    let rep = `${m[1]}: ${value}${m[3]}`;
    // Hits run last-to-first, so the last radius in a block gets the curve and the rest see it.
    if (!/borderCurve/.test(block.body)) {
      const lineStart = out.lastIndexOf('\n', m.index) + 1;
      const indent = out.slice(lineStart, m.index);
      const ownLine = /^\s*$/.test(indent) && m[3] && /^\s*\n/.test(out.slice(m.index + m[0].length));
      rep += ownLine ? `\n${indent}borderCurve: 'continuous',` : m[3] ? ` borderCurve: 'continuous',` : `, borderCurve: 'continuous'`;
    }
    out = out.slice(0, m.index) + rep + out.slice(m.index + m[0].length);
  }
  return out;
}

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name) && e.name !== 'theme.ts' ? [p] : [];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let changed = 0;
  for (const file of files(join(ROOT, 'src'))) {
    const rel = relative(ROOT, file);
    const src = readFileSync(file, 'utf8');
    const out = transform(src, rel);
    if (out === src) continue;
    changed++;
    if (check) console.log(rel);
    else writeFileSync(file, out);
  }
  console.log(`${check ? 'would change' : 'changed'} ${changed} files`);
  // Self-check: a second pass changes nothing.
  if (!check) {
    for (const file of files(join(ROOT, 'src'))) {
      const src = readFileSync(file, 'utf8');
      if (transform(src, relative(ROOT, file)) !== src) throw new Error(`not idempotent: ${file}`);
    }
  }
}
