import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { test } from 'node:test';

import { defaultTemplate, parseTemplate, resolveBackend } from '../src/backend.ts';

test('quotes keep spaces inside one argument', () => {
  const tokens = parseTemplate('command --flag1 "some value" %s --flag2');

  assert.deepEqual(tokens, ['command', '--flag1', 'some value', '%s', '--flag2']);
});

test('placeholder in the middle becomes one argument with the raw text', () => {
  const text = 'текст "в кавычках" 100% готово';
  const backend = resolveBackend(text, 'command --flag1 "some value" "%s" --flag2', 'linux');

  assert.equal(backend.command, 'command');
  assert.deepEqual(backend.args, ['--flag1', 'some value', text, '--flag2']);
});

test('template without the placeholder gets the text appended', () => {
  const backend = resolveBackend('Готово', 'custom-binary', 'linux');

  assert.equal(backend.command, 'custom-binary');
  assert.deepEqual(backend.args, ['Готово']);
});

test('home shortcut in the executable is expanded', () => {
  const backend = resolveBackend('Текст', '~/.local/bin/voice --speaker xenia %s', 'linux');

  assert.equal(backend.command, `${homedir()}/.local/bin/voice`);
  assert.deepEqual(backend.args, ['--speaker', 'xenia', 'Текст']);
});

test('empty template falls back to the platform speaker', () => {
  const backend = resolveBackend('Текст', '   ', 'darwin');

  assert.equal(backend.command, 'say');
  assert.deepEqual(backend.args, ['Текст']);
});

test('each platform has its own default speaker', () => {
  assert.equal(defaultTemplate('darwin'), 'say %s');
  assert.equal(defaultTemplate('linux'), 'spd-say %s');
  assert.match(defaultTemplate('win32'), /^powershell\.exe .*%s$/);
});

test('an unclosed quote is rejected instead of reordered', () => {
  assert.throws(() => parseTemplate('command --name "unterminated value'), /Unclosed " quote/);
  assert.throws(() => parseTemplate("command --name 'unterminated value"), /Unclosed ' quote/);
});
