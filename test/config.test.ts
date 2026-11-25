import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { findCommandTemplate, saveCommandTemplate } from '../src/config.ts';

function createSettingsPath(content?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'pi-digest-settings-'));
  const file = join(dir, 'settings.json');

  if (content) {
    writeFileSync(file, content, 'utf8');
  }

  return file;
}

test('absent settings file has no command template', () => {
  const file = createSettingsPath();

  assert.equal(findCommandTemplate(file), undefined);
});

test('saved template is read back', () => {
  const file = createSettingsPath();

  saveCommandTemplate('~/.local/bin/voice --speaker xenia "%s"', file);

  assert.equal(findCommandTemplate(file), '~/.local/bin/voice --speaker xenia "%s"');
});

test('saving keeps every other setting and the extension subkeys', () => {
  const file = createSettingsPath('{\n  "theme": "dark",\n  "pi-digest": {\n    "enabled": true\n  }\n}\n');

  saveCommandTemplate('custom-binary %s', file);

  const settings = JSON.parse(readFileSync(file, 'utf8'));

  assert.equal(settings.theme, 'dark');
  assert.equal(settings['pi-digest'].enabled, true);
  assert.equal(settings['pi-digest'].command, 'custom-binary %s');
});

test('blank template counts as absent', () => {
  const file = createSettingsPath('{"pi-digest":{"command":"   "}}');

  assert.equal(findCommandTemplate(file), undefined);
});

test('broken settings file falls back to the platform default', () => {
  const file = createSettingsPath('{ not json');

  assert.equal(findCommandTemplate(file), undefined);
});

test('an array settings file is ignored instead of overwritten', () => {
  const file = createSettingsPath('[]');

  saveCommandTemplate('custom-binary %s', file);

  const settings = JSON.parse(readFileSync(file, 'utf8'));

  assert.equal(settings['pi-digest'].command, 'custom-binary %s');
});
