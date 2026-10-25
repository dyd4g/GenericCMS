const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const edit = load('lib/page-edit.js'), translations = load('lib/translations.js', { './page-edit': edit }), config = load('lib/config.js');
  const server = load('lib/server.js', { './config': config, './page-edit': edit });
  const source = { id: 12, name: 'About', path: 'about-page', language: 'en', status: 'Active', publishDate: '2025-01-01', content: '<p>Hello</p>', style: 'p {color:blue}', attributes: [{ id: 8, values: [{ id: 10 }] }], parent: { id: 5 }, translations: [{ id: 15, language: 'es' }], featuredImageUrl: 'https://example.test/image.png', permissions: [{ id: 1 }] };
  assert.deepEqual(translations.translationVersions(source).map(item => item.language), ['en', 'es']);
  assert.throws(() => translations.translationPayload(source, 'es'), /already exists/);
  assert.throws(() => translations.translationPayload(source, 'en'), /already exists/);
  const payload = translations.translationPayload(source, 'ar');
  assert.equal(payload.language, 'ar'); assert.equal(payload.status, 'Inactive'); assert.equal(payload.publishDate, null);
  assert.equal(payload.path, source.path); assert.equal(payload.content, source.content); assert.equal(payload.style, source.style);
  assert.deepEqual(payload.attributes, { 8: [10] }); assert.equal(payload.parentId, 5);
  assert.equal(payload.id, undefined); assert.equal(payload.featuredImageUrl, undefined); assert.equal(payload.permissions, undefined);
  assert.equal(source.status, 'Active');
  const handler = load('pages/api/translation.js', { '../../lib/server': server, '../../lib/config': config, '../../lib/translations': translations }).default;
  async function run(req) { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; } }; await handler(req, res); return result; }
  const request = { method: 'POST', headers: { origin: 'https://cms.test', host: 'cms.test', 'content-type': 'application/json', authorization: 'Bearer fake' }, body: { siteId: 1, pageId: 12, language: 'ar', content: 'Do not trust client content', status: 'Active' } };
  const original = global.fetch; let calls;
  try {
    calls = []; global.fetch = async (url, init) => { calls.push([url, init]); return calls.length === 1 ? { ok: true, json: async () => source } : { ok: true, json: async () => 23 }; };
    const result = await run(request);
    assert.equal(result.code, 200); assert.equal(result.body.id, 23);
    assert.equal(calls[0][0], config.connection.cms + '/sites/1/pages/12');
    assert.equal(calls[1][0], config.connection.cms + '/sites/1/pages'); assert.equal(calls[1][1].method, 'POST');
    assert.deepEqual(JSON.parse(calls[1][1].body), payload);
    assert.equal((await run({ ...request, method: 'DELETE' })).code, 405);
    assert.equal((await run({ ...request, headers: { ...request.headers, origin: 'https://other.test' } })).code, 403);
    assert.equal((await run({ ...request, headers: { ...request.headers, authorization: '' } })).code, 401);
    assert.equal((await run({ ...request, body: { ...request.body, language: 'xx' } })).code, 400);
    calls = []; assert.equal((await run({ ...request, body: { ...request.body, language: 'es' } })).code, 409); assert.equal(calls.length, 1);
    calls = []; global.fetch = async () => (++calls.length === 1 ? { ok: true, json: async () => source } : { ok: false, status: 403 });
    assert.equal((await run(request)).code, 403);
  } finally { global.fetch = original; }
  console.log('Translation grouping, inactive copies, existing POST contract, duplicate and permission guards passed. No live writes.');
})().catch(error => { console.error(error); process.exit(1); });
