export function pageActionPath(query, method, body) {
  const id = value => { const number = Number(value); if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Invalid page identifier.'); return number; };
  const path = `sites/${id(query.siteId)}/Pages/${id(query.pageId)}`;
  if (method === 'DELETE') return path;
  if (method === 'PUT' && Number.isInteger(body) && body >= -2147483648 && body <= 2147483647) return `${path}/order`;
  throw new Error('Invalid page order request.');
}

export function movePage(items, fromId, toId) {
  const from = items.findIndex(item => item.id === fromId), to = items.findIndex(item => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
}

export async function persistPageOrder(rows, write) {
  for (let index = 0; index < rows.length; index++) if (rows[index].order !== index + 1) await write(rows[index].id, index + 1);
}

// Older API sibling references can include top-level pages from other sites.
// Intersect with the site's paginated page list before reading or ordering any references.
export async function loadPageGroup(siteId, current, children, read) {
  const allowed = new Set(); let index = 0, count = 1;
  while (index < count) {
    const list = await read({ resource: 'pages', siteId, page: index });
    for (const item of list.results || []) allowed.add(item.id);
    count = list.pagesCount || 0; index++;
    if (index > 1000) throw new Error('Too many pages to load safely.');
  }
  const refs = children ? current.children || [] : [current, ...(current.siblings || [])];
  const ids = [...new Set(refs.map(item => item.id))].filter(id => allowed.has(id));
  const rows = [];
  for (const id of ids) {
    const page = await read({ resource: 'page', siteId, pageId: id });
    const parent = page.parent?.id ?? null;
    if (parent === (children ? current.id : current.parent?.id ?? null)) rows.push(page);
  }
  return rows.sort((a, b) => a.order - b.order || a.id - b.id);
}
