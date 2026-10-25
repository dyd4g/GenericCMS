// Environment for GenericCMS. The service addresses are the same ones the existing CMS uses (see the HP LIFE Test settings).
export const environments = {
  'hplife-test': {
    id: 'hplife-test', name: 'HP LIFE Test', siteId: 1, clientId: '1',
    cms: 'https://api.hplife-test.dyd.solutions/cms',
    identity: 'https://api.hplife-test.dyd.solutions/identity',
    learnerSite: 'https://www.hplife-test.dyd.solutions',
    previewFrame: 'http://127.0.0.1:3020/preview',
  },
};
const id = process.env.NEXT_PUBLIC_APP_ENV || 'hplife-test';
if (!environments[id]) throw new Error('Unknown application environment.');
export const connection = Object.freeze(environments[id]);

export const languages = [['ar', 'العربية'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['hi', 'हिन्दी'], ['id', 'Bahasa Indonesia'], ['pt', 'Português'], ['zh-Hans', '简体中文']];
export const languageName = code => (languages.find(([c]) => c === code) || [code, code || '—'])[1];
