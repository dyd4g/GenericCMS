# GenericCMS (HP LIFE content manager, first slice)

A new editor interface for the existing CMS API. Page editing uses the original CMS update contract; the backend and existing apps are unchanged.

## What exists now
- **Sign in** with the existing identity account (the same one the old CMS uses). The session lives in the browser tab only.
- **Sites** list, then a **Pages** list for a site: search by name or path, filter by language and status, sort by name or newest, 10 per page, with the feature-scope attribute shown.
- **Page view:** Preview, HTML, Custom CSS and Details tabs. Preview shows the saved page inside the real HP LIFE header and footer (via GenericLMS `/preview`) or as content only (sandboxed, scripts blocked), at desktop, tablet and phone widths. Details show title, heading, author, publish date, SEO, attributes, translations, parent, child and sibling pages and page managers.
- A banner on every page explains that saving an Active page will change the live site immediately, because the CMS API keeps no drafts or history (see `GenericLMS/docs/cms-api-findings.md`).

## Not built (and why)
- New-page creation, deletion, and dedicated relationship/image management are deferred. Existing relationships, publish dates and images are preserved during page saves.
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
The browser calls `/api/cms` on this app with its own bearer token for reads. Unknown languages, statuses and sort values are dropped, ids must be positive integers.

The **Edit page** tab provides HTML, CSS, page settings and SEO editors plus an unsaved preview. Save is explicit. Saving an Active page requires confirmation because it changes the live site immediately. Unsaved navigation is guarded, failed saves retain edits, and expired sessions can be renewed in an editor sign-in dialog.

The **Attributes** editor loads the site's existing `GET sites/{siteId}/pages/attributes` definitions. It supports required, single-selection, multiple-selection and nested attributes. Removing a parent selection clears its dependent selections. Selected value IDs are saved in the same dictionary on the existing page PUT; attribute definitions are not modified.

**Images and files** opens a media dialog from the editor toolbar. Browse/search existing assets, view their files, and upload to a selected asset using the existing multipart `POST sites/{siteId}/assets/{assetId}/files`. Asset downloads have temporary private URLs and cannot be embedded as permanent page content. Permanent HTTP(S) URLs can be inserted as escaped image/file-link HTML at the current selection. Featured images use the existing multipart PUT / DELETE `sites/{siteId}/Pages/{pageId}/featuredImage` and take effect immediately after confirmation. Uploads are limited to 29 MB in this UI. No public general-purpose media-upload endpoint has been added.

`/api/page` forwards the existing `PUT sites/{siteId}/Pages/{pageId}` with the same field names, status values, Client-Id and bearer authorization used by the original CMS. The API remains responsible for edit permissions. Tests use mocked requests; they never write live content.
