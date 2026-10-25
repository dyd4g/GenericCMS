# GenericCMS (HP LIFE content manager, first slice)

A new editor interface for the existing CMS API. Page editing uses the original CMS update contract; the backend and existing apps are unchanged.

## What exists now
- **Sign in** with the existing identity account (the same one the old CMS uses). The session lives in the browser tab only.
- **Sites** list, then a **Pages** list for a site: search by name or path, filter by language and status, sort by name or newest, 10 per page, with the feature-scope attribute shown.
- **Page view:** Preview, HTML, Custom CSS and Details tabs. Preview shows the saved page inside the real HP LIFE header and footer (via GenericLMS `/preview`) or as content only (sandboxed, scripts blocked), at desktop, tablet and phone widths. Details show title, heading, author, publish date, SEO, attributes, translations, parent, child and sibling pages and page managers.
- A banner on every page explains that saving an Active page will change the live site immediately, because the CMS API keeps no drafts or history (see `GenericLMS/docs/cms-api-findings.md`).

## Not built (and why)
- Dedicated contact relationship management is deferred. Publish dates are preserved during page saves.
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

The **Languages** tab lists all eight supported languages with current, available and missing states. Creating a missing language version re-reads the saved source on the server, then sends the existing `POST sites/{siteId}/pages` contract. The path, content, CSS, SEO, attributes and parent relationship are copied; status is Inactive and publish date is cleared. Featured images and page permissions are not copied. This is a manual translation starting point, not automatic translation. Creation requires site-admin access; the backend enforces permissions and path/language uniqueness. **Edit page → Compare languages** shows a saved reference title/HTML beside the editable current title/HTML. Unsaved edits stay in the editor when changing tabs and are guarded when switching page versions.

**New page** on the site page list opens the full editor for a blank page. **Duplicate page** on a saved page opens the same editor with copied saved content, CSS, SEO, attributes and parent relationship, plus a suggested copy name/path. Children, featured images and managers are not duplicated. Both use the existing `POST sites/{siteId}/pages` contract and enforce Inactive status and an empty publish date; creation never activates content. After creation, open the new page to continue editing or add media. **Page settings → Choose parent** searches/paginates existing pages, checks the candidate's ancestor chain to avoid loops, and saves the chosen parent ID with the normal page POST/PUT. Clear parent makes the page top-level. Existing API permission and uniqueness checks remain authoritative.

**Order and delete** displays same-level or child pages that the current account can access. Drag handles or arrow buttons change the local sequence; Save order sends sequential integer-body PUT requests to the existing `sites/{siteId}/Pages/{pageId}/order`. Writes stop on failure and the list reloads because the backend has no batch transaction. References are intersected with the site page list to avoid cross-site top-level siblings returned by the old API. Content edits must be saved/reset first. Deletion requires typing the page name, then uses the existing DELETE endpoint. It removes only that language version; children become top-level pages and other translations remain. Tests never issue live deletes or order changes.

**Page managers** lists individual managers and searches/paginates eligible group members using the existing `GET sites/{siteId}/pages/{pageId}/permissionCandidates`. After confirmation, grant uses `POST sites/{siteId}/pages/{pageId}/permissions` with an integer user ID; removal uses `DELETE sites/{siteId}/pages/{pageId}/permissions/{userId}`. The manager/candidate lists refresh after changes. Assignments apply immediately to the current language version; inherited site/system administrator access remains unchanged. Site-admin permission is enforced by the original API, and its permission/group-membership errors are shown in the UI. Tests mock all permission writes.

**Images and files** opens a media dialog from the editor toolbar. Browse/search existing assets, view their files, and upload to a selected asset using the existing multipart `POST sites/{siteId}/assets/{assetId}/files`. Asset downloads have temporary private URLs and cannot be embedded as permanent page content. Permanent HTTP(S) URLs can be inserted as escaped image/file-link HTML at the current selection. Featured images use the existing multipart PUT / DELETE `sites/{siteId}/Pages/{pageId}/featuredImage` and take effect immediately after confirmation. Uploads are limited to 29 MB in this UI. No public general-purpose media-upload endpoint has been added.

`/api/page` forwards the existing `PUT sites/{siteId}/Pages/{pageId}` with the same field names, status values, Client-Id and bearer authorization used by the original CMS. The API remains responsible for edit permissions. Tests use mocked requests; they never write live content.
