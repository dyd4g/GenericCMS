# GenericCMS (HP LIFE content manager, first slice)

A new editor interface for the existing CMS API. It is read-only in this version, and it never changes the CMS API or its data.

## What exists now
- **Sign in** with the existing identity account (the same one the old CMS uses). The session lives in the browser tab only.
- **Sites** list, then a **Pages** list for a site: search by name or path, filter by language and status, sort by name or newest, 10 per page, with the feature-scope attribute shown.
- **Page view:** Preview, HTML, Custom CSS and Details tabs. Preview shows the saved page inside the real HP LIFE header and footer (via GenericLMS `/preview`) or as content only (sandboxed, scripts blocked), at desktop, tablet and phone widths. Details show title, heading, author, publish date, SEO, attributes, translations, parent, child and sibling pages and page managers.
- A banner on every page explains that saving an Active page will change the live site immediately, because the CMS API keeps no drafts or history (see `GenericLMS/docs/cms-api-findings.md`).

## Not built (and why)
- Editing and saving: wait until the draft and publish question is decided.
- Templates, headers, footers, stylesheets, scripts: the CMS API has no such models for HP LIFE.
- Assets and Contacts: a separate feature set; not needed for pages.
- Themes: deferred by decision.

## Run
```
npm install
npm run serve        # builds, then serves on http://127.0.0.1:3021
npm test
```
For the "In the HP LIFE site" preview, GenericLMS must be running on http://127.0.0.1:3020.

`public/brand/hplife-preview.css` is generated from GenericLMS: `node scripts/sync-preview-css.cjs`.

## How it talks to the CMS
The browser calls `/api/cms` on this app with its own bearer token; the route checks the request shape and forwards a GET to the CMS API. Only GET is allowed. Unknown languages, statuses and sort values are dropped, ids must be positive integers.
