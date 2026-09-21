import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

const require = createRequire(import.meta.url);
const parserRequire = createRequire(require.resolve('remark-mdx-frontmatter'));
const toml = parserRequire('toml');

test('TOML parser correction preserves MDX frontmatter integration', async () => {
  const result = await compile('+++\ntitle = "Synthetic maintenance"\ntags = ["test"]\n+++\n# Document', {
    remarkPlugins: [[remarkFrontmatter, ['toml']], remarkMdxFrontmatter],
  });
  assert.match(String(result), /Synthetic maintenance/);
  assert.match(String(result), /frontmatter/);
  const parsed = toml.parse('title="Test"\n[metadata]\nvalid=true');
  assert.equal(parsed.title, 'Test');
  assert.equal(parsed.metadata.valid, true);
  assert.equal(Object.getPrototypeOf(parsed), null);
});

test('CVE-2026-77465 deeply nested TOML returns a bounded parse error', () => {
  const input = 'a=' + '['.repeat(3000) + '1' + ']'.repeat(3000);
  assert.throws(() => toml.parse(input), (error) => {
    assert.notEqual(error.name, 'RangeError');
    assert.match(error.message, /nest|depth/i);
    return true;
  });
});

const qs = require('qs');

test('qs constructor-shaped input can be serialized without a TypeError', () => {
  const parsed = qs.parse('x%5Bconstructor%5D%5BisBuffer%5D=y', { plainObjects: true });
  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.doesNotThrow(() => qs.stringify(parsed));
  assert.deepEqual(qs.parse(qs.stringify(parsed), { plainObjects: true }), parsed);
  assert.equal(Object.prototype.isBuffer, undefined);
});

test('qs enforces arrayLimit for combined bracket and comma input', () => {
  const options = { comma: true, arrayLimit: 3, throwOnLimitExceeded: true };
  assert.throws(() => qs.parse('a[]=1,2,3,4', options), RangeError);
  assert.deepEqual(qs.parse('a[]=1,2,3', options), { a: [['1', '2', '3']] });
  assert.deepEqual(qs.parse('page=2&filter[category]=writing'), {
    page: '2', filter: { category: 'writing' },
  });
});
