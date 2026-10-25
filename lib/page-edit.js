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

// A successful PUT has no response body. If its follow-up GET fails, keep the saved
// view consistent without replacing attribute metadata with the write dictionary.
export function savedPageView(page, draft, definitions = []) {
  const known = new Map((page.attributes || []).map(item => [item.id, item]));
  function visit(items) { for (const item of items || []) { known.set(item.id, item); for (const value of item.values || []) visit(value.attributes); } }
  visit(definitions);
  return { ...page, ...draft, order: Number(draft.order),
    parent: draft.parentId == null ? null : page.parent?.id === draft.parentId ? page.parent : { id: draft.parentId, name: `Page ${draft.parentId}`, language: draft.language },
    attributes: Object.entries(draft.attributes || {}).filter(([, values]) => values.length).map(([key, values]) => {
      const definition = known.get(Number(key));
      return { id: Number(key), name: definition?.name || `Attribute ${key}`, description: definition?.description,
        values: values.map(id => ({ id, value: definition?.values?.find(value => value.id === id)?.value || `Value ${id}` })) };
    }),
  };
}
