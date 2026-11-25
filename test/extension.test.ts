import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseCommand } from '../src/extension.ts';

test('command name is case-insensitive and the template keeps its case', () => {
  assert.deepEqual(parseCommand(' Command ~/.local/bin/Voice "%s" '), {
    name: 'command',
    rest: '~/.local/bin/Voice "%s"',
  });
});

test('bare command has empty rest', () => {
  assert.deepEqual(parseCommand('command'), {
    name: 'command',
    rest: '',
  });
});

test('empty input falls back to the status branch', () => {
  assert.deepEqual(parseCommand('   '), {
    name: '',
    rest: '',
  });
});
