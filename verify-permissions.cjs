const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const permissions = load('lib/page-permissions.js'), config = load('lib/config.js'), server = load('lib/server.js', { './config': config, './page-edit': load('lib/page-edit.js') });
  assert.equal(server.cmsReadPath({ resource: 'pagePermissionCandidates', siteId: 1, pageId: 12, page: 2, search: ' a&b ' }), 'sites/1/pages/12/permissionCandidates?page=2&resultsPerPage=15&search=a%26b');
  assert.throws(() => server.cmsReadPath({ resource: 'pagePermissionCandidates', siteId: 1, pageId: '../12' }));
  assert.throws(() => server.cmsReadPath({ resource: 'pagePermissionCandidates', siteId: 1, pageId: 12, page: -1 }));
  assert.deepEqual(permissions.pagePermissionRequest({ siteId: 1, pageId: 12 }, 'POST', 7), { path: 'sites/1/pages/12/permissions', body: 7 });
  assert.deepEqual(permissions.pagePermissionRequest({ siteId: 1, pageId: 12, userId: 7 }, 'DELETE'), { path: 'sites/1/pages/12/permissions/7' });
  for (const user of ['7', 0, -1, 1.5, {}, 2147483648]) assert.throws(() => permissions.pagePermissionRequest({ siteId: 1, pageId: 12 }, 'POST', user));
  assert.throws(() => permissions.pagePermissionRequest({ siteId: 1, pageId: 12 }, 'PUT', 7));
  const handler = load('pages/api/page-permission.js', { '../../lib/server': server, '../../lib/config': config, '../../lib/page-permissions': permissions }).default;
  async function run(req) { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; }, end() {} }; await handler(req, res); return result; }
  const req = { method: 'POST', query: { siteId: 1, pageId: 12 }, headers: { host: 'cms.test', origin: 'https://cms.test', authorization: 'Bearer fake', 'content-type': 'application/json' }, body: 7 };
  const original = global.fetch; let call;
  try {
    global.fetch = async (url, init) => { call = { url, init }; return { ok: true }; };
    assert.equal((await run(req)).code, 204); assert.equal(call.url, config.connection.cms + '/sites/1/pages/12/permissions'); assert.equal(call.init.method, 'POST'); assert.equal(call.init.body, '7'); assert.equal(call.init.headers['Client-Id'], config.connection.clientId);
    assert.equal((await run({ ...req, method: 'DELETE', query: { ...req.query, userId: 7 } })).code, 204); assert.equal(call.url, config.connection.cms + '/sites/1/pages/12/permissions/7'); assert.equal(call.init.body, undefined);
    assert.equal((await run({ ...req, headers: { ...req.headers, origin: 'https://other.test' } })).code, 403);
    assert.equal((await run({ ...req, headers: { ...req.headers, authorization: '' } })).code, 401);
    assert.equal((await run({ ...req, method: 'PUT' })).code, 405);
    global.fetch = async () => ({ ok: false, status: 403 }); const denied = await run(req); assert.equal(denied.code, 403); assert.match(denied.body.message, /site administrators/);
    global.fetch = async () => ({ ok: false, status: 400, text: async () => '"User is not a member of the group who owns the page site."' }); const invalid = await run(req); assert.equal(invalid.code, 400); assert.match(invalid.body.message, /not a member/);
    global.fetch = async () => ({ ok: false, status: 401 }); assert.equal((await run(req)).code, 401);
  } finally { global.fetch = original; }
  console.log('Eligible-user search, integer grant, scoped revoke, validation and permission errors passed. No live access changes.');
})().catch(error => { console.error(error); process.exit(1); });
