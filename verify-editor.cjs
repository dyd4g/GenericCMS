const assert = require('node:assert/strict');
(async () => {
  const { EditorState, StateEffect, Transaction } = await import('@codemirror/state');
  const { history, undo, redo, undoDepth } = await import('@codemirror/commands');
  const { html } = await import('@codemirror/lang-html');
  const { css } = await import('@codemirror/lang-css');
  const original = '<!-- preserve -->\n<section class="about-page-emotion-cache-X" data-name="a&amp;b"><p>中文 العربية &nbsp; &#160;</p><img src="/x.png" /></section>';
  let state = EditorState.create({ doc: original, extensions: [history(), html()] });
  assert.equal(state.doc.toString(), original); // Opening never parses and reserializes saved HTML.
  const start = original.indexOf('中文');
  state = state.update({ changes: { from: start, to: start + 2, insert: '简体中文' }, selection: { anchor: start + 4 } }).state;
  const edited = state.doc.toString(); assert.ok(edited.includes('class="about-page-emotion-cache-X"')); assert.ok(edited.includes('&nbsp; &#160;')); assert.equal(undoDepth(state), 1);
  // History/selection survive the same reconfiguration used on tab/full-screen remounts.
  state = state.update({ effects: StateEffect.reconfigure.of([history(), html()]) }).state;
  assert.equal(state.selection.main.head, start + 4); assert.equal(undoDepth(state), 1);
  const target = { get state() { return state; }, dispatch(transaction) { state = transaction.state; } };
  assert.equal(undo(target), true); assert.equal(state.doc.toString(), original);
  assert.equal(redo(target), true); assert.equal(state.doc.toString(), edited);
  state = state.update({ changes: { from: 0, to: state.doc.length, insert: original }, annotations: Transaction.addToHistory.of(false) }).state;
  assert.equal(state.doc.toString(), original);
  const stylesheet = '.a::before { content: "العربية < >"; }\n@media(max-width:600px){.a{display:none}}';
  const windowsHtml = '<div>\r\n  中文 &nbsp;\r\n</div>';
  const windowsState = EditorState.create({ doc: windowsHtml, extensions: [history(), html(), EditorState.lineSeparator.of('\r\n')] });
  assert.equal(windowsState.sliceDoc(), windowsHtml);
  assert.equal(EditorState.create({ doc: stylesheet, extensions: [history(), css()] }).doc.toString(), stylesheet);
  const large = original.repeat(1500); assert.equal(EditorState.create({ doc: large, extensions: [history(), html()] }).doc.toString(), large);
  console.log('Exact HTML/CSS preservation, multilingual content, undo/redo, remount history and large documents passed.');
})().catch(error => { console.error(error); process.exit(1); });
