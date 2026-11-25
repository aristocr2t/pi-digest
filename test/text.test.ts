import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanText } from '../src/text.ts';

test('clamping never leaves half of a surrogate pair', () => {
  const text = 'a'.repeat(1999) + '😀' + ' tail';
  const cleaned = cleanText(text);
  const last = cleaned.charCodeAt(cleaned.length - 1);

  assert.equal(last >= 0xd800 && last <= 0xdbff, false);
  assert.equal(cleaned.includes('�'), false);
});

test('markdown and code fences are stripped', () => {
  assert.equal(cleanText('**Готово** `код` [ссылка](https://example.com)'), 'Готово код ссылка');
});
