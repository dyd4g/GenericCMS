const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
(async () => {
  const { previewDocument } = load('lib/preview.js');
  for (const language of ['ar', 'en', 'es', 'fr', 'hi', 'id', 'pt', 'zh-Hans']) {
    const html = previewDocument({ language, content: '<p>Test العربية</p>', style: '<style>p { color: blue; }</style>' });
    assert.ok(html.includes(`lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.ok(html.includes('<p>Test العربية</p>')); assert.equal((html.match(/<style>/g) || []).length, 1);
  }
  const edit = load('lib/page-edit.js');
  const page = { id: 1, parent: { id: 2, name: 'Parent' }, attributes: [{ id: 7, name: 'Existing', values: [{ id: 10, value: 'Old' }] }] };
  const draft = { ...edit.pagePayload({ ...page, status: 'Inactive', language: 'en' }), parentId: null, order: '3', attributes: { 7: [11], 8: [20] } };
  const view = edit.savedPageView(page, draft, [{ id: 7, name: 'Existing', values: [{ id: 11, value: 'New' }] }, { id: 8, name: 'Nested', values: [{ id: 20, value: 'Nested value' }] }]);
  assert.equal(view.parent, null); assert.equal(view.order, 3); assert.equal(view.attributes[0].values[0].value, 'New');
  assert.deepEqual(edit.pagePayload(view).attributes, draft.attributes); assert.deepEqual(page.attributes[0].values, [{ id: 10, value: 'Old' }]);
  const client = load('lib/client.js'); const originalStorage = global.sessionStorage, originalFetch = global.fetch;
  let stored = new Map(), calls = 0;
  try {
    global.sessionStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
    global.fetch = async () => { calls++; throw new Error('Network offline'); };
    client.saveSession('expired', -1); await assert.rejects(() => client.cmsUpdatePage(1, 1, draft), /session has expired/); assert.equal(calls, 0);
    client.saveSession('valid', 3600); const snapshot = JSON.stringify(draft);
    await assert.rejects(() => client.cmsUpdatePage(1, 1, draft), /Network offline/); assert.equal(JSON.stringify(draft), snapshot);
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Your session has expired. Sign in again.' }) });
    await assert.rejects(() => client.cmsUpdatePage(1, 1, draft), /session has expired/); assert.equal(JSON.stringify(draft), snapshot);
    global.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'Your account does not have permission to edit this page.' }) });
    await assert.rejects(() => client.cmsUpdatePage(1, 1, draft), /permission/); assert.equal(JSON.stringify(draft), snapshot);
    await assert.rejects(() => client.cmsGet({ resource: 'pagePermissionCandidates', siteId: 1, pageId: 1 }), error => error.status === 403);
  } finally { global.sessionStorage = originalStorage; global.fetch = originalFetch; }
  console.log('Eight-language preview direction, saved-view recovery, offline/expired/restricted save behavior passed. No real writes.');
})().catch(error => { console.error(error); process.exit(1); });
