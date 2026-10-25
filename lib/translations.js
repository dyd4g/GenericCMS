import { pagePayload } from './page-edit';

export function translationVersions(page) {
  return [page, ...(page.translations || [])].filter((item, index, all) => all.findIndex(other => other.language === item.language) === index);
}

export function translationPayload(source, language) {
  if (translationVersions(source).some(item => item.language === language)) throw new Error('This language version already exists. Open it instead.');
  return { ...pagePayload(source), language, status: 'Inactive', publishDate: null };
}
