// The existing CMS PUT replaces these fields. Keep non-edited relationships and attributes.
export function pagePayload(page) {
  return {
    path: page.path ?? '', name: page.name ?? '', order: page.order ?? 0,
    status: page.status, language: page.language, title: page.title ?? '',
    heading: page.heading ?? null, content: page.content ?? '', style: page.style ?? null,
    author: page.author ?? null, description: page.description ?? null,
    publishDate: page.publishDate ?? null, parentId: page.parent?.id ?? page.parentId ?? null,
    attributes: Array.isArray(page.attributes)
      ? Object.fromEntries(page.attributes.map(a => [a.id, (a.values || []).map(v => v.id)]))
      : (page.attributes || {}),
    seo: { description: page.seo?.description ?? null, keywords: page.seo?.keywords ?? null },
  };
}

export function validatePage(page) {
  if (!page.name?.trim()) return 'Enter a page name.';
  if (!/^[a-zA-Z0-9/_-]*$/.test(page.path || '')) return 'Use letters, numbers, slashes, dashes, or underscores in the path.';
  if (!Number.isInteger(Number(page.order))) return 'Order must be a whole number.';
  if (!['Active', 'Inactive'].includes(page.status)) return 'Choose an Active or Inactive status.';
  return '';
}
