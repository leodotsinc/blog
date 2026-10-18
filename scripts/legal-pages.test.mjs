import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { legal } from '../data/legal.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const privacySource = read('app/(site)/privacy/page.tsx');
const termsSource = read('app/(site)/terms/page.tsx');
const sitemapSource = read('app/sitemap.ts');
const footerSource = read('components/Footer.tsx');

const REQUIRED_EN =
  "n8n email's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.";

test('Limited Use sentence is exact in English and wired into the privacy page', () => {
  const { before, linkText, after } = legal.limitedUse.en;
  assert.equal(`${before}${linkText}${after}`, REQUIRED_EN);
  assert.equal(
    legal.googlePolicyUrl,
    'https://developers.google.com/terms/api-services-user-data-policy',
  );
  assert.match(privacySource, /legal\.limitedUse\.en\.before/);
  assert.match(privacySource, /legal\.limitedUse\.pt\.before/);
  assert.match(privacySource, /href=\{legal\.googlePolicyUrl\}/);
  assert.match(legal.limitedUse.pt.before + legal.limitedUse.pt.linkText, /qualquer outro aplicativo/);
  assert.match(legal.limitedUse.pt.after, /Uso Limitado/);
});

test('privacy page states the required disclosures in both languages', () => {
  for (const phrase of [
    'only to classify the owner&apos;s own mail',
    'advertising',
    'train generalized AI or machine-learning models',
    'remain until the owner deletes them',
    'No human reads this data',
    'somente para classificar o e-mail do próprio proprietário',
    'publicidade',
    'treinar modelos generalizados de IA ou aprendizado de máquina',
    'permanecem até o proprietário',
    'Nenhuma pessoa lê esses dados',
  ]) {
    assert.ok(privacySource.replace(/\s+/g, ' ').includes(phrase), phrase);
  }
  assert.equal(legal.gmailScope, 'https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(legal.revokeUrl, 'https://myaccount.google.com/permissions');
  assert.equal(legal.contactEmail, 'leonardo@leodots.com');
  assert.match(legal.lastUpdated, /^\d{4}-\d{2}-\d{2}$/);
});

test('terms keep only the allowed claims', () => {
  const text = termsSource.toLowerCase();
  for (const banned of ['as is', 'como está', 'warranty', 'garantia', 'governed', 'regidos', 'lei brasileira', 'brazilian law']) {
    assert.ok(!text.includes(banned), banned);
  }
  assert.match(termsSource, /not offered to anyone else/);
  assert.match(termsSource, /href="\/privacy"/);
});

test('routes declare self-referencing canonicals and are not noindex', () => {
  assert.match(privacySource, /canonical: "\/privacy"/);
  assert.match(termsSource, /canonical: "\/terms"/);
  assert.ok(!/robots/i.test(privacySource + termsSource));
});

test('sitemap and footer include both pages', () => {
  assert.match(sitemapSource, /"\/privacy"/);
  assert.match(sitemapSource, /"\/terms"/);
  assert.match(footerSource, /href="\/privacy"/);
  assert.match(footerSource, /href="\/terms"/);
});
