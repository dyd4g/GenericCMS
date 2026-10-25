export function previewDocument(page) {
  const language = String(page.language || 'en').replace(/[^a-zA-Z-]/g, '');
  const style = String(page.style ?? '').replace(/<\/?style[^>]*>?/gi, '');
  return `<!doctype html><html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/brand/hplife-preview.css"><style>${style}</style></head><body><div class="editor-preview">${page.content ?? ''}</div></body></html>`;
}
