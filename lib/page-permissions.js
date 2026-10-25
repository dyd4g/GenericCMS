export function pagePermissionRequest(query, method, userId) {
  const id = value => { const number = Number(value); if (!Number.isInteger(number) || number <= 0 || number > 2147483647) throw new Error('Invalid user or page identifier.'); return number; };
  const path = `sites/${id(query.siteId)}/pages/${id(query.pageId)}/permissions`;
  if (method === 'POST' && typeof userId === 'number') return { path, body: id(userId) };
  if (method === 'DELETE') return { path: `${path}/${id(query.userId)}` };
  throw new Error('Unsupported permission request.');
}
