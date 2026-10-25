import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { EditorView, basicSetup } from 'codemirror';
import { Compartment, EditorState, StateEffect, Transaction } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { undo, redo, undoDepth, redoDepth, indentMore, indentLess } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';

// Edit the source string directly. No DOM serialization or automatic formatting.
const CodeEditor = forwardRef(function CodeEditor({ value = '', onChange, language = 'html', label = 'Page HTML', disabled = false, readOnly = false, stateCache }, ref) {
  const host = useRef(null), view = useRef(null), changed = useRef(onChange), access = useRef(new Compartment());
  const [metrics, setMetrics] = useState({ line: 1, column: 1, undo: 0, redo: 0 });
  changed.current = onChange;
  useImperativeHandle(ref, () => ({
    get selectionStart() { return view.current?.state.selection.main.from ?? value.length; },
    get selectionEnd() { return view.current?.state.selection.main.to ?? value.length; },
    focus() { view.current?.focus(); },
    insert(text) { const editor = view.current; if (editor) { const { from, to } = editor.state.selection.main; editor.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input', scrollIntoView: true }); editor.focus(); } },
    setSelectionRange(start, end) { const editor = view.current; if (editor) editor.dispatch({ selection: { anchor: Math.min(start, editor.state.doc.length), head: Math.min(end, editor.state.doc.length) }, scrollIntoView: true }); },
  }));
  useEffect(() => {
    const updateMetrics = state => { const head = state.selection.main.head, line = state.doc.lineAt(head); setMetrics({ line: line.number, column: head - line.from + 1, undo: undoDepth(state), redo: redoDepth(state) }); };
    const extensions = [basicSetup, EditorState.lineSeparator.of(value.includes('\r\n') ? '\r\n' : '\n'), language === 'css' ? css() : html(), EditorView.lineWrapping,
      access.current.of([EditorState.readOnly.of(disabled || readOnly), EditorView.editable.of(!disabled && !readOnly)]),
      EditorView.contentAttributes.of({ 'aria-label': label, 'aria-multiline': 'true', spellcheck: 'false', dir: 'ltr' }),
      EditorView.theme({ '&': { fontSize: '14px', backgroundColor: '#fff' }, '.cm-scroller': { fontFamily: 'Consolas, "Courier New", monospace', minHeight: '420px', maxHeight: '65vh', overflow: 'auto' }, '.cm-content': { padding: '12px 0', minHeight: '420px' }, '.cm-gutters': { backgroundColor: '#f4f6f9', color: '#5b6475', borderRight: '1px solid #e3e7ee' }, '&.cm-focused': { outline: '2px solid #024ad8', outlineOffset: '-2px' }, '.cm-search': { fontFamily: 'inherit' } }),
      EditorView.updateListener.of(update => { if (update.docChanged) changed.current?.(update.state.sliceDoc()); if (update.docChanged || update.selectionSet) updateMetrics(update.state); }),
    ];
    let state = stateCache?.current;
    if (!state) state = EditorState.create({ doc: value, extensions });
    // Reconfigure mount-specific listeners and compartments while retaining source,
    // selection and history when switching tabs or entering the expanded workspace.
    else {
      state = state.update({ effects: StateEffect.reconfigure.of(extensions) }).state;
      if (state.sliceDoc() !== value) state = state.update({ changes: { from: 0, to: state.doc.length, insert: value }, annotations: Transaction.addToHistory.of(false) }).state;
    }
    const editor = new EditorView({ state, parent: host.current }); view.current = editor; updateMetrics(editor.state);
    return () => { if (stateCache) stateCache.current = editor.state; editor.destroy(); view.current = null; };
  }, [language, label, stateCache]);
  useEffect(() => { const editor = view.current; if (editor && editor.state.sliceDoc() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, annotations: Transaction.addToHistory.of(false) }); }, [value]);
  useEffect(() => { view.current?.dispatch({ effects: access.current.reconfigure([EditorState.readOnly.of(disabled || readOnly), EditorView.editable.of(!disabled && !readOnly)]) }); }, [disabled, readOnly]);
  const command = fn => { if (view.current) { fn(view.current); view.current.focus(); } };
  return <Box sx={{ minWidth: 0 }}>
    <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="subtitle2" sx={{ mr: 'auto' }}>{label}</Typography>
      {!readOnly && <><Button size="small" disabled={disabled || !metrics.undo} onClick={() => command(undo)}>Undo</Button><Button size="small" disabled={disabled || !metrics.redo} onClick={() => command(redo)}>Redo</Button><Button size="small" disabled={disabled} onClick={() => command(indentMore)}>Indent</Button><Button size="small" disabled={disabled} onClick={() => command(indentLess)}>Outdent</Button></>}
      <Button size="small" onClick={() => command(openSearchPanel)}>Find{!readOnly && ' / replace'}</Button>
    </Stack>
    <Box ref={host} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', textAlign: 'left', direction: 'ltr' }} />
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Line {metrics.line}, column {metrics.column} · {value.length.toLocaleString()} characters · Ctrl/Cmd+F to find</Typography>
  </Box>;
});
export default CodeEditor;

