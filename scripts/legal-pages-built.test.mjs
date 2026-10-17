import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { legal } from '../data/legal.ts';

test('built HTML carries canonical and the Limited Use sentence', () => {
  // This suite runs after the FULL build; a missing artifact must fail.
  const html = readFileSync(new URL('../.next/server/app/privacy.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/leodots\.com\/privacy"/);
  assert.ok(!/<meta name="robots"[^>]*noindex/.test(html));
  const text = html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
  const { before, linkText, after } = legal.limitedUse.en;
  assert.ok(text.includes(`${before}${linkText}${after}`));
});
