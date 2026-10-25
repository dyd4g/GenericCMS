const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const edit = load('lib/page-edit.js'), creation = load('lib/page-create.js', { './page-edit': edit });
  const source = { id: 12, name: 'About', path: 'about', language: 'en', status: 'Active', publishDate: '2025-01-01', content: '<p>Original</p>', style: 'p {color:blue}', attributes: [{ id: 1, values: [{ id: 2 }] }], parent: { id: 5, name: 'Parent' }, featuredImageUrl: 'https://example.test/image.png', permissions: [{ id: 1 }], children: [{ id: 6 }] };
  const seed = creation.newPageSeed(source);
  assert.equal(seed.name, 'About (copy)'); assert.equal(seed.path, 'about-copy'); assert.equal(seed.status, 'Inactive'); assert.equal(seed.publishDate, null);
  assert.equal(seed.content, source.content); assert.equal(seed.style, source.style); assert.deepEqual(seed.attributes, { 1: [2] });
  for (const key of ['id', 'children', 'permissions', 'featuredImageUrl']) assert.equal(seed[key], undefined);
  assert.equal(creation.newPageSeed().status, 'Inactive');
  assert.equal(edit.pagePayload({ ...edit.pagePayload(source), parentId: null }).parentId, null);
  await creation.verifyParent(5, 12, async id => ({ parent: id === 5 ? { id: 7 } : null }));
  await assert.rejects(() => creation.verifyParent(5, 12, async () => ({ parent: { id: 12 } })), /loop/);
  await assert.rejects(() => creation.verifyParent(5, 12, async () => ({ parent: { id: 5 } })), /loop/);
  const config = load('lib/config.js'), server = load('lib/server.js', { './config': config, './page-edit': edit });
  const handler = load('pages/api/create-page.js', { '../../lib/server': server, '../../lib/config': config, '../../lib/page-edit': edit }).default;
  async function run(req) { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; } }; await handler(req, res); return result; }
  const request = { method: 'POST', headers: { origin: 'https://cms.test', host: 'cms.test', 'content-type': 'application/json', authorization: 'Bearer fake' }, query: { siteId: 1 }, body: { ...seed, status: 'Active', publishDate: '2026-01-01' } };
  const original = global.fetch; let call;
  try {
    global.fetch = async (url, init) => { call = { url, init }; return { ok: true, json: async () => 99 }; };
    const result = await run(request); assert.equal(result.code, 200); assert.equal(result.body.id, 99);
    assert.equal(call.url, config.connection.cms + '/sites/1/pages'); assert.equal(call.init.method, 'POST');
    const payload = JSON.parse(call.init.body); assert.equal(payload.status, 'Inactive'); assert.equal(payload.publishDate, null); assert.equal(payload.parentId, 5); assert.deepEqual(payload.attributes, { 1: [2] });
    assert.equal((await run({ ...request, method: 'DELETE' })).code, 405);
    assert.equal((await run({ ...request, headers: { ...request.headers, origin: 'https://other.test' } })).code, 403);
    assert.equal((await run({ ...request, body: { ...seed, name: '' } })).code, 400);
    global.fetch = async () => ({ ok: false, status: 400, text: async () => '"There is already a page using the provided code and language."' });
    const duplicate = await run(request); assert.equal(duplicate.code, 400); assert.match(duplicate.body.message, /already a page/);
    global.fetch = async () => ({ ok: false, status: 403 }); assert.equal((await run(request)).code, 403);
  } finally { global.fetch = original; }
  console.log('New/duplicate payloads, existing create contract, inactive enforcement, duplicate errors and hierarchy cycles passed. No live writes.');
})().catch(error => { console.error(error); process.exit(1); });
