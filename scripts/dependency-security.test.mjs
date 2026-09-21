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
  assert.deepEqual(toml.parse('title="Test"\n[metadata]\nvalid=true'), {
    title: 'Test', metadata: { valid: true },
  });
});

test('CVE-2026-77465 deeply nested TOML returns a bounded parse error', () => {
  const input = 'a=' + '['.repeat(3000) + '1' + ']'.repeat(3000);
  assert.throws(() => toml.parse(input), (error) => {
    assert.notEqual(error.name, 'RangeError');
    assert.match(error.message, /nest|depth/i);
    return true;
  });
});
