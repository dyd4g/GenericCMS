const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const edit = load('lib/page-edit.js');
  const original = { id: 13, name: 'About', path: 'about-page', status: 'Active', language: 'en', title: 'About us', content: '<div class="existing">Hello</div>', style: '.existing {color:blue}', order: 7, parent: { id: 5 }, publishDate: '2024-01-02T00:00:00Z', attributes: [{ id: 8, values: [{ id: 99 }, { id: 100 }] }], seo: { description: 'Description', keywords: 'test' } };
  const body = edit.pagePayload(original);
  assert.deepEqual(body.attributes, { 8: [99, 100] }); assert.equal(body.parentId, 5);
  assert.deepEqual(edit.pagePayload(body), body); assert.equal(body.publishDate, original.publishDate);
  const changed = { ...body, content: '<div class="existing">Updated</div>' };
  assert.deepEqual({ ...changed, content: body.content }, body);
  assert.match(edit.validatePage({ ...body, path: 'bad path' }), /path/);
  assert.match(edit.validatePage({ ...body, name: '' }), /name/);
  assert.match(edit.validatePage({ ...body, order: 1.5 }), /whole/);
  const config = load('lib/config.js'), server = load('lib/server.js', { './config': config, './page-edit': edit });
  let call;
  await server.updateCmsPage({ siteId: '1', pageId: '13' }, changed, 'test-token', async (url, init) => { call = { url, init }; return { ok: true, status: 204 }; });
  assert.equal(call.url, config.connection.cms + '/sites/1/Pages/13'); assert.equal(call.init.method, 'PUT');
  assert.deepEqual(JSON.parse(call.init.body), changed); assert.equal(call.init.headers['Client-Id'], config.connection.clientId);
  await assert.rejects(() => server.updateCmsPage({ siteId: '../1', pageId: 13 }, body, 't'), /Unknown/);
  await assert.rejects(() => server.updateCmsPage({ siteId: 1, pageId: 13 }, body, 't', async () => ({ ok: false, status: 403 })), /permission/);
  await assert.rejects(() => server.updateCmsPage({ siteId: 1, pageId: 13 }, body, 't', async () => ({ ok: false, status: 400, text: async () => '"Duplicate page path."' })), /Duplicate/);
  const handler = load('pages/api/page.js', { '../../lib/server': server }).default;
  const run = async req => { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; return this; } }; await handler(req, res); return result.code; };
  assert.equal(await run({ method: 'DELETE', headers: {} }), 405);
  assert.equal(await run({ method: 'PUT', headers: { origin: 'https://other.test', host: 'cms.test' } }), 403);
  assert.equal(await run({ method: 'PUT', headers: { origin: 'https://cms.test', host: 'cms.test', 'content-type': 'application/json' } }), 401);
  console.log('Page update contract, preserved data, validation and route guards passed. No live writes.');
})().catch(e => { console.error(e); process.exit(1); });

