const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => imports[n] || require(n), m, m.exports); return m.exports; }
const { selectAttribute, validateAttributes } = load('lib/page-attributes.js');
const grandchild = { id: 3, name: 'Detail', allowMultiSelection: true, values: [{ id: 30, value: 'Detail' }] };
const child = { id: 2, name: 'Category', isRequired: true, allowMultiSelection: false, values: [{ id: 20, value: 'Category', attributes: [grandchild] }] };
const root = { id: 1, name: 'Feature scope', isRequired: true, allowMultiSelection: true, values: [{ id: 10, value: 'News', attributes: [child] }, { id: 11, value: 'Other' }] };
const initial = { 1: [10], 2: [20], 3: [30], 99: [999] };
assert.equal(validateAttributes([root], initial), '');
assert.match(validateAttributes([root], {}), /Feature scope/);
assert.match(validateAttributes([root], { 1: [10] }), /Category/);
assert.equal(validateAttributes([root], { 1: [11] }), '');
assert.match(validateAttributes([root], { 1: [10], 2: [20, 21] }), /only one/);
assert.deepEqual(selectAttribute(root, [11], initial), { 1: [11], 99: [999] });
assert.deepEqual(selectAttribute(root, [10, 11], initial), { ...initial, 1: [10, 11] });
assert.deepEqual(selectAttribute(child, [], initial), { 1: [10], 2: [], 99: [999] });
assert.deepEqual(initial[3], [30]); // Selection updates never mutate the saved page.
const edit = load('lib/page-edit.js');
const server = load('lib/server.js', { './config': load('lib/config.js'), './page-edit': edit });
assert.equal(server.cmsReadPath({ resource: 'pageAttributes', siteId: '1' }), 'sites/1/pages/attributes');
assert.throws(() => server.cmsReadPath({ resource: 'pageAttributes', siteId: '../1' }), /Unknown/);
assert.deepEqual(edit.pagePayload({ attributes: selectAttribute(root, [11], initial) }).attributes, { 1: [11], 99: [999] });
console.log('Attribute read path, required/single/multiple selections, nested pruning and PUT preservation passed. No real requests.');
