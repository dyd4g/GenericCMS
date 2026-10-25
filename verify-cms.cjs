const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function load(file, reqs = {}) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', compile(file))(n => reqs[n] || require(n), m, m.exports);
  return m.exports;
}
(async () => {
  const config = load('lib/config.js'); const server = load('lib/server.js', { './config': config });
  const base = 'https://api.hplife-test.dyd.solutions/cms';
  // Read paths: only validated, known shapes reach the CMS.
  assert.equal(server.cmsReadPath({ resource: 'sites' }), 'sites');
  assert.equal(server.cmsReadPath({ resource: 'site', siteId: '1' }), 'sites/1');
  assert.equal(server.cmsReadPath({ resource: 'page', siteId: '1', pageId: '13' }), 'sites/1/pages/13');
  assert.equal(server.cmsReadPath({ resource: 'pages', siteId: '1' }), 'sites/1/pages?page=0&resultsPerPage=10&sortBy=Name');
  assert.equal(server.cmsReadPath({ resource: 'pages', siteId: '1', search: ' about ', language: 'fr', status: 'Active', sortBy: 'CreationDate', page: '2' }), 'sites/1/pages?page=2&resultsPerPage=10&sortBy=CreationDate&search=about&language=fr&status=Active');
  // Unknown language, status and sort values are dropped, not forwarded.
  assert.equal(server.cmsReadPath({ resource: 'pages', siteId: '1', language: 'xx', status: 'Deleted', sortBy: 'x' }), 'sites/1/pages?page=0&resultsPerPage=10&sortBy=Name');
  assert.equal(server.cmsReadPath({ resource: 'pages', siteId: '1', search: 'a&b=c' }).includes('a%26b%3Dc'), true);
  for (const bad of ['0', '-1', 'x', '1.5', '../2', '']) assert.throws(() => server.cmsReadPath({ resource: 'site', siteId: bad }), /Unknown item/);
  assert.throws(() => server.cmsReadPath({ resource: 'pages', siteId: '1', page: '-1' }), /Invalid page/);
  assert.throws(() => server.cmsReadPath({ resource: 'delete' }), /Unsupported/);
  assert.throws(() => server.cmsReadPath({}), /Unsupported/);

  // Requests are GET only, carry the bearer token and Client-Id, and never follow a full URL.
  const calls = [];
  const fetcher = async (url, init) => { calls.push([url, init]); return { ok: true, status: 200, json: async () => ({ ok: 1 }) }; };
  await server.readCms('sites/1', 'tok', fetcher);
  assert.equal(calls[0][0], `${base}/sites/1`); assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer tok'); assert.equal(calls[0][1].headers['Client-Id'], '1');
  await assert.rejects(() => server.readCms('https://evil.test/x', 't', fetcher), /Invalid service request/);
  await assert.rejects(() => server.readCms('/x', 't', fetcher), /Invalid service request/);
  for (const [status, text] of [[401, /expired/], [403, /does not have access/], [404, /not found/], [500, /unavailable/]]) await assert.rejects(() => server.readCms('sites', 't', async () => ({ ok: false, status })), text);

  // Sign-in: form-encoded password grant against the identity service, then a check that the account can see a site.
  calls.length = 0;
  const seq = [{ ok: true, json: async () => ({ access_token: 'T', expires_in: 900 }) }, { ok: true, json: async () => [{ id: 1 }] }];
  const out = await server.signIn(' a@b.com ', 'pw', async (url, init) => { calls.push([url, init]); return seq.shift(); });
  assert.equal(calls[0][0], 'https://api.hplife-test.dyd.solutions/identity/api/token');
  assert.equal(calls[0][1].body.get('grant_type'), 'password'); assert.equal(calls[0][1].body.get('username'), 'a@b.com');
  assert.equal(out.accessToken, 'T'); assert.equal(out.expiresIn, 900); assert.equal(calls[1][0], `${base}/sites`);
  await assert.rejects(() => server.signIn('', 'pw', fetcher), /Enter your email/);
  await assert.rejects(() => server.signIn('a', '', fetcher), /Enter your email/);
  await assert.rejects(() => server.signIn('a@b.com', 'x', async () => ({ ok: false, status: 400 })), /incorrect/);
  await assert.rejects(() => server.signIn('a@b.com', 'x', async () => ({ ok: false, status: 429 })), /Too many/);
  const noAccess = [{ ok: true, json: async () => ({ access_token: 'T' }) }, { ok: false, status: 403 }];
  await assert.rejects(() => server.signIn('a@b.com', 'x', async () => noAccess.shift()), /do not have access to this CMS/);

  // Route handlers: only GET on the proxy, only POST from the app's own origin on sign-in.
  const handler = file => load(file, { '../../lib/server': server }).default;
  const run = async (fn, req) => { const result = {}; const res = { setHeader() {}, status(c) { result.status = c; return res; }, json(b) { result.body = b; return res; } }; await fn(req, res); return result; };
  const proxy = handler('pages/api/cms.js');
  assert.equal((await run(proxy, { method: 'POST', headers: {}, query: {} })).status, 405);
  assert.equal((await run(proxy, { method: 'DELETE', headers: {}, query: {} })).status, 405);
  assert.equal((await run(proxy, { method: 'GET', headers: {}, query: { resource: 'sites' } })).status, 401);
  assert.equal((await run(proxy, { method: 'GET', headers: { authorization: 'Bearer t' }, query: { resource: 'nope' } })).status, 400);
  const session = handler('pages/api/session.js');
  assert.equal((await run(session, { method: 'GET', headers: {} })).status, 405);
  assert.equal((await run(session, { method: 'POST', headers: { host: 'a.test', origin: 'https://evil.test', 'content-type': 'application/json' }, body: {} })).status, 403);
  assert.equal((await run(session, { method: 'POST', headers: { host: 'a.test', origin: 'http://a.test', 'content-type': 'text/plain' }, body: {} })).status, 415);
  console.log('CMS read paths, proxy limits, sign-in contract and route guards passed. No real requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
