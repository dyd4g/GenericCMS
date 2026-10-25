const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const organize = load('lib/page-organize.js');
  const rows = [{ id: 1, order: 1 }, { id: 2, order: 2 }, { id: 3, order: 3 }];
  assert.deepEqual(organize.movePage(rows, 1, 3).map(item => item.id), [2, 3, 1]); assert.deepEqual(rows.map(item => item.id), [1, 2, 3]);
  assert.deepEqual(organize.movePage(rows, 3, 1).map(item => item.id), [3, 1, 2]); assert.equal(organize.movePage(rows, 99, 1), rows);
  let writes = []; await organize.persistPageOrder(rows, async (...args) => writes.push(args)); assert.equal(writes.length, 0);
  await organize.persistPageOrder(organize.movePage(rows, 3, 1), async (...args) => writes.push(args)); assert.deepEqual(writes, [[3, 1], [1, 2], [2, 3]]);
  writes = []; await assert.rejects(() => organize.persistPageOrder(organize.movePage(rows, 3, 1), async (...args) => { writes.push(args); if (writes.length === 2) throw new Error('403'); }), /403/); assert.equal(writes.length, 2);
  const reads = []; const current = { id: 1, order: 9, parent: null, siblings: [{ id: 2 }, { id: 999 }], children: [{ id: 3 }] };
  const read = async query => { reads.push(query); if (query.resource === 'pages') return { pagesCount: 2, results: query.page ? [{ id: 3 }] : [{ id: 1 }, { id: 2 }] }; return { id: query.pageId, order: query.pageId, parent: query.pageId === 3 ? { id: 1 } : null }; };
  assert.deepEqual((await organize.loadPageGroup(1, current, false, read)).map(item => item.id), [1, 2]); assert.equal(reads.some(query => query.pageId === 999), false);
  assert.deepEqual((await organize.loadPageGroup(1, current, true, read)).map(item => item.id), [3]);
  assert.equal(organize.pageActionPath({ siteId: 1, pageId: 12 }, 'PUT', 3), 'sites/1/Pages/12/order');
  assert.equal(organize.pageActionPath({ siteId: 1, pageId: 12 }, 'DELETE'), 'sites/1/Pages/12');
  assert.throws(() => organize.pageActionPath({ siteId: 1, pageId: '../12' }, 'DELETE'));
  for (const value of ['3', {}, 1.5, 2147483648]) assert.throws(() => organize.pageActionPath({ siteId: 1, pageId: 12 }, 'PUT', value));
  const config = load('lib/config.js'), server = load('lib/server.js', { './config': config, './page-edit': load('lib/page-edit.js') });
  const handler = load('pages/api/page-action.js', { '../../lib/server': server, '../../lib/config': config, '../../lib/page-organize': organize }).default;
  async function run(req) { const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return this; }, json(body) { result.body = body; }, end() {} }; await handler(req, res); return result; }
  const req = { method: 'PUT', query: { siteId: 1, pageId: 12 }, headers: { origin: 'https://cms.test', host: 'cms.test', authorization: 'Bearer fake' }, body: 3 };
  const original = global.fetch; let call;
  try {
    global.fetch = async (url, init) => { call = { url, init }; return { ok: true }; };
    assert.equal((await run(req)).code, 204); assert.equal(call.url, config.connection.cms + '/sites/1/Pages/12/order'); assert.equal(call.init.body, '3');
    assert.equal((await run({ ...req, method: 'DELETE' })).code, 204); assert.equal(call.url, config.connection.cms + '/sites/1/Pages/12'); assert.equal(call.init.body, undefined);
    assert.equal((await run({ ...req, headers: { ...req.headers, origin: 'https://other.test' } })).code, 403);
    assert.equal((await run({ ...req, headers: { ...req.headers, authorization: '' } })).code, 401);
    global.fetch = async () => ({ ok: false, status: 403 }); assert.equal((await run(req)).code, 403);
  } finally { global.fetch = original; }
  console.log('Order moves, partial-write stopping, site-scoped groups, integer PUT and DELETE contracts passed. No live writes.');
})().catch(error => { console.error(error); process.exit(1); });
