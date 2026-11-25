import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { initPromptFile, upsertSection, VOICE_SECTION } from '../src/prompt.ts';

test('section is appended when the file has no Voice rules', () => {
  const updated = upsertSection('## Rules\n\nBe kind.\n');

  assert.equal(updated, `## Rules\n\nBe kind.\n\n${VOICE_SECTION}`);
});

test('existing Voice rules are replaced instead of duplicated', () => {
  const content = '## Rules\n\nBe kind.\n\n## Voice\n\nCall voice(text).\n\n## Tools\n\nBe brief.\n';
  const updated = upsertSection(content);

  assert.equal(updated, `## Rules\n\nBe kind.\n\n${VOICE_SECTION}\n## Tools\n\nBe brief.\n`);
  assert.equal(updated.match(/## Voice/g)?.length, 1);
});

test('a heading that only starts with Voice is left alone', () => {
  const content = '## Voice notes\n\nKeep this.\n';
  const updated = upsertSection(content);

  assert.equal(updated, `## Voice notes\n\nKeep this.\n\n${VOICE_SECTION}`);
});

test('a deeper Voice heading is not replaced', () => {
  const content = '### Voice\n\nKeep this too.\n';
  const updated = upsertSection(content);

  assert.equal(updated, `### Voice\n\nKeep this too.\n\n${VOICE_SECTION}`);
});

test('init writes once and reports the file as unchanged afterwards', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pi-digest-'));
  const file = join(dir, 'APPEND_SYSTEM.md');

  writeFileSync(file, '## Rules\n\nBe kind.\n', 'utf8');

  assert.deepEqual(initPromptFile(file), { path: file, changed: true });
  assert.equal(readFileSync(file, 'utf8'), `## Rules\n\nBe kind.\n\n${VOICE_SECTION}`);
  assert.deepEqual(initPromptFile(file), { path: file, changed: false });
});
