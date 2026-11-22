import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { color, CATEGORY_COLORS, radius, font } from '../constants/theme.ts';
import { mapRadius, mapFont } from '../../scripts/apply-design-tokens.mjs';

// One design standard: every colour, corner radius and font size in src/ comes from theme.ts.
// Fix a failure with `node scripts/apply-design-tokens.mjs` or by picking a theme value.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Pictures that paint with their own colours / shapes. Keep this list short.
const ART_COLORS: Record<string, string[] | 'all'> = {
  'src/components/foodymon/RoomBackground.tsx': 'all',
  'src/components/foodymon/WorldBackdrop.tsx': 'all',
  'src/components/foodymon/NightOverlay.tsx': 'all',
  'src/app/journey.tsx': 'all',
  'src/components/foodymon/PetAvatar.tsx': ['#F08A5D', '#F5B700'], // heart particle, trophy
};
const ART_RADII = ['src/components/foodymon/RoomBackground.tsx', 'src/components/foodymon/HatchEgg.tsx'];

const HEXES = new Set(
  [...Object.values(color), ...Object.values(CATEGORY_COLORS).flatMap((c) => Object.values(c))].map((h) => h.toUpperCase()),
);
const RADII = new Set<number>(Object.values(radius));
const SIZES = new Set<number>(Object.values(font));

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return sources(rel);
    return /\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts') && rel !== 'src/constants/theme.ts' ? [rel] : [];
  });
}

function scan(check: (file: string, line: string) => string[]): string[] {
  const hits: string[] = [];
  for (const file of sources('src')) {
    readFileSync(join(ROOT, file), 'utf8')
      .split('\n')
      .forEach((line, i) => check(file, line).forEach((bad) => hits.push(`${file}:${i + 1}: ${bad}`)));
  }
  return hits;
}

test('colours come from theme.ts', () => {
  const hits = scan((file, line) => {
    const allowed = ART_COLORS[file];
    if (allowed === 'all') return [];
    return [...line.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)]
      .map((m) => m[0].toUpperCase())
      .filter((h) => !HEXES.has(h) && !allowed?.includes(h));
  });
  assert.deepEqual(hits, [], `Colours outside src/constants/theme.ts:\n${hits.join('\n')}`);
});

test('corner radii are on the radius scale', () => {
  const hits = scan((file, line) =>
    ART_RADII.includes(file)
      ? []
      : [...line.matchAll(/\bborder(?:Top|Bottom)?(?:Left|Right)?Radius: *(\d+(?:\.\d+)?)/g)]
          .filter((m) => Number(m[1]) !== 0 && !RADII.has(Number(m[1])))
          .map((m) => m[0]),
  );
  assert.deepEqual(hits, [], `Radii off the scale (${[...RADII].join(', ')}):\n${hits.join('\n')}`);
});

test('font sizes are on the type ramp', () => {
  const hits = scan((_file, line) =>
    [...line.matchAll(/fontSize: *(\d+(?:\.\d+)?)/g)].filter((m) => !SIZES.has(Number(m[1]))).map((m) => m[0]),
  );
  assert.deepEqual(hits, [], `Font sizes off the ramp (${[...SIZES].join(', ')}):\n${hits.join('\n')}`);
});

test('the token script rounds to the scale (ties go up, circles go full)', () => {
  assert.equal(mapRadius(14, 'borderRadius', ''), 16);
  assert.equal(mapRadius(10, 'borderRadius', ''), 12);
  assert.equal(mapRadius(22, 'borderRadius', 'width: 44, height: 44'), 999);
  assert.equal(mapRadius(30, 'borderTopLeftRadius', ''), 28);
  assert.equal(mapRadius(36, 'borderRadius', ''), 999);
  assert.equal(mapFont(10), 12);
  assert.equal(mapFont(14), 15);
  assert.equal(mapFont(16), 17);
  assert.equal(mapFont(52), 52);
});
