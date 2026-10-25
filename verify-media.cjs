const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const media = load('lib/media.js'), config = load('lib/config.js');
  const server = load('lib/server.js', { './config': config, './page-edit': load('lib/page-edit.js') });
  assert.equal(server.cmsReadPath({ resource: 'assets', siteId: 1, page: 2, search: 'A&B' }), 'sites/1/assets?page=2&resultsPerPage=15&sortBy=ModifiedDate&search=A%26B');
  assert.equal(server.cmsReadPath({ resource: 'asset', siteId: 1, assetId: 2 }), 'sites/1/assets/2');
  assert.throws(() => server.cmsReadPath({ resource: 'asset', siteId: 1, assetId: '../2' }));
  for (const url of ['javascript:alert(1)', 'data:image/png,x', 'https://a.test/i?sig=secret', 'https://a.test/i?X-Amz-Signature=s', 'https://a.test/i?token=x', 'https://user:pass@a.test/i']) assert.equal(media.permanentMediaUrl(url), '');
  assert.equal(media.mediaMarkup('https://a.test/i.png', 'A "quote" & <text>', true), '<img src="https://a.test/i.png" alt="A &quot;quote&quot; &amp; &lt;text&gt;" style="max-width:100%;height:auto;" />');
  assert.equal(media.mediaMarkup('https://a.test/a.pdf', 'Download', false), '<a href="https://a.test/a.pdf">Download</a>');
  assert.throws(() => media.mediaMarkup('https://a.test/i?se=tomorrow', '', true));
  assert.equal(media.mediaWriteTarget({ action: 'featured', siteId: 1, pageId: 12 }, 'PUT'), 'sites/1/Pages/12/featuredImage');
  assert.equal(media.mediaWriteTarget({ action: 'assetFile', siteId: 1, assetId: 3 }, 'POST'), 'sites/1/assets/3/files');
  assert.throws(() => media.mediaWriteTarget({ action: 'assetFile', siteId: 1, assetId: 3 }, 'DELETE'));
  const handler = load('pages/api/media.js', { '../../lib/config': config, '../../lib/server': server, '../../lib/media': media }).default;
  const bytes = Buffer.from('--boundary\r\nContent-Disposition: form-data; name="file"; filename="sample.png"\r\n\r\nTEST\r\n--boundary--');
  const req = { method: 'PUT', query: { action: 'featured', siteId: 1, pageId: 12 }, headers: { host: 'cms.test', origin: 'https://cms.test', authorization: 'Bearer fake', 'content-type': 'multipart/form-data; boundary=boundary' }, async *[Symbol.asyncIterator]() { yield bytes; } };
  async function run(request) { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; }, end() {} }; await handler(request, res); return result; }
  const originalFetch = global.fetch; let call;
  try {
    global.fetch = async (url, init) => { call = { url, init }; return { ok: true, status: 200, text: async () => '"https://a.test/image.png"' }; };
    const result = await run(req);
    assert.equal(result.code, 200); assert.equal(result.body.value, 'https://a.test/image.png');
    assert.equal(call.url, config.connection.cms + '/sites/1/Pages/12/featuredImage');
    assert.equal(call.init.method, 'PUT'); assert.deepEqual(call.init.body, bytes);
    assert.equal(call.init.headers['Content-Type'], req.headers['content-type']);
    assert.equal((await run({ ...req, headers: { ...req.headers, origin: 'https://other.test' } })).code, 403);
    assert.equal((await run({ ...req, headers: { ...req.headers, authorization: '' } })).code, 401);
    assert.equal((await run({ ...req, headers: { ...req.headers, 'content-type': 'application/json' } })).code, 415);
  } finally { global.fetch = originalFetch; }
  console.log('Media paths, safe HTML, temporary-link rejection and unchanged multipart forwarding passed. No real writes.');
})().catch(error => { console.error(error); process.exit(1); });
