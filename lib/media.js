export function permanentMediaUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    const keys = [...url.searchParams.keys()].map(key => key.toLowerCase());
    if (keys.some(key => ['sig', 'se', 'token', 'access_token', 'expires', 'signature'].includes(key) || key.startsWith('x-amz-') || key.startsWith('x-goog-'))) return '';
    return url.href;
  } catch { return ''; }
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function mediaMarkup(url, label, image) {
  const safe = permanentMediaUrl(url);
  if (!safe) throw new Error('Use a permanent http or https URL. Temporary download links cannot be inserted.');
  return image ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(label)}" style="max-width:100%;height:auto;" />` : `<a href="${escapeHtml(safe)}">${escapeHtml(label || 'Download file')}</a>`;
}

export function mediaWriteTarget(query, method) {
  const id = value => { const number = Number(value); if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Invalid item identifier.'); return number; };
  const siteId = id(query.siteId);
  if (query.action === 'featured' && ['PUT', 'DELETE'].includes(method)) return `sites/${siteId}/Pages/${id(query.pageId)}/featuredImage`;
  if (query.action === 'assetFile' && method === 'POST') return `sites/${siteId}/assets/${id(query.assetId)}/files`;
  throw new Error('Unsupported media request.');
}
