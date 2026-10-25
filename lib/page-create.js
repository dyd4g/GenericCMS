import { pagePayload } from './page-edit';

export function newPageSeed(source) {
  return source ? { ...pagePayload(source), name: `${source.name} (copy)`, path: `${source.path.replace(/\/+$/, '')}-copy`, parent: source.parent, status: 'Inactive', publishDate: null } : { name: '', path: '', title: '', language: 'en', status: 'Inactive', content: '', style: '', order: 0, attributes: {}, seo: {} };
}

export async function verifyParent(candidateId, pageId, readPage) {
  const visited = new Set(); let id = candidateId;
  while (id) {
    if (id === pageId || visited.has(id)) throw new Error('Choose a parent outside this page’s descendants. A page hierarchy cannot contain a loop.');
    if (visited.size >= 100) throw new Error('This hierarchy is too deep to verify. Choose another parent.');
    visited.add(id); const ancestor = await readPage(id); id = ancestor.parent?.id;
  }
}
