import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The app never shows emoji (they render as iPhone glyphs). Pictures are Ionicons or image assets.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/u;

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = join(dir, e.name);
    if (e.isDirectory()) return files(rel, ext);
    return ext.test(e.name) ? [rel] : [];
  });
}

test('no emoji in app source, email templates or the store listing', () => {
  const targets = [
    ...files('src', /\.tsx?$/),
    ...files('supabase/email-templates', /\.html$/),
    ...files('store', /\.md$/),
  ];
  const hits: string[] = [];
  for (const file of targets) {
    readFileSync(join(ROOT, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (EMOJI.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
  assert.deepEqual(hits, [], `Use Ionicons or image assets instead of emoji:\n${hits.join('\n')}`);
});
