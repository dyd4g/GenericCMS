# Page-maintenance QA — October 25, 2026

Environment: GenericCMS at 127.0.0.1:3021, existing HP LIFE Test CMS API, site 1. Existing APIs and legacy applications were not changed. All created pages remained Inactive. No existing manager assignments were modified.

## Live browser checks

- Created disposable English page 874 with HTML, title and requiresAuth=true; read it back successfully.
- Duplicated it as page 875 with a new path, retained content/attributes, and selected 874 as parent.
- Created Arabic translation 876 through the existing creation contract. Verified the existing/missing language list and language switching.
- Edited and saved Arabic HTML; verified the English saved reference beside the editable Arabic HTML.
- Verified unsaved Arabic content in the HP LIFE shell and mobile content-only preview. Arabic text is right-aligned after adding dir=rtl.
- Uploaded a generated one-pixel PNG as page 876's featured image. Inserted its returned permanent public URL into HTML and saved it successfully.
- Reordered only the two disposable children of page 874. Verified the persisted order: Arabic first, English second.
- Deleted parent 874. Verified page 876 survived, its parent was cleared, its order remained 1, its selected attribute remained, and its English translation still existed.
- Deleted Arabic record 876 and verified English record 875 remained with Arabic marked Missing. Deleted English record 875 afterward.

Test records were deliberately named `CMS QA disposable 20261025` and `(copy)`, with paths beginning `cms-qa-disposable-20261025`. All three were deleted after testing. None were published. The final page-list search for that path prefix returned no matches.

## Automated checks

Nine suites cover API request contracts and route guards, creation/duplication, nested attributes, translation grouping and inactive creation, safe image/link insertion, multipart uploads, site-scoped ordering and partial failures, manager grants/revokes, and offline/expired/forbidden saves. Preview-document tests cover direction and language tags for all eight supported languages. Save failures leave the submitted edit object unchanged; a failed post-save read preserves readable attribute metadata and the selected parent in the fallback view.

These mocked checks are not equivalent to real restricted-user sign-in or pixel-by-pixel validation of all eight translated public sites.

## Fixes from this pass

- Arabic content-only preview uses RTL; other supported languages use LTR.
- Preview labels distinguish saved content from unsaved edits and no longer claim the app is read-only.
- Editor action buttons wrap on narrow screens.
- Failed order loading no longer leaves the tab locked as if there were unsaved changes.
- Child ordering opens first and avoids scanning the site's 82 page-list pages. Top-level sibling ordering retains the site-ID intersection safeguard.
- Order reload refreshes the current page's saved order after a partial write, avoiding a later content save overwriting it from stale state.
- Successful save followed by a failed GET retains readable attributes and parent metadata and reports that reloading failed.
- Eligible-user search distinguishes a permission response from other service errors.

## Remaining verification

- The live eligible-user search showed a CMS service error. No manager assignments were changed. API contracts remain unchanged; diagnosing the upstream service is separate backend work.
- A real restricted page-manager account is needed to verify login and effective page restrictions end to end.
- Expired-session and offline behavior is covered by simulated client tests; credential re-entry recovery has not been exercised with real credentials.
- Full visual comparison of every page in all eight languages is still outstanding; English/Arabic preview paths were exercised here.
- Asset-library file upload was not exercised against an existing asset, to avoid adding files to real asset records. The multipart contract is tested with mocks; featured-image upload was tested live.
- Uploaded blob deletion timing remains controlled by the existing backend cleanup job; page cleanup does not claim immediate physical blob removal.

## HTML editor follow-up

The CodeMirror HTML/CSS workspace was checked on existing Simplified Chinese page 19 without saving any page data. Opening it retained the original 3,581 HTML characters and left Save changes disabled. Find located `HP LIFE`; a single unsaved replacement updated the live preview. Switching to the 19,928-character CSS source and back preserved HTML undo history. Undo restored the exact original document and disabled Save changes again. Expanding and closing the workspace retained history and selection. The browser was refreshed after testing to clear the test-only redo entry.

The tenth automated suite checks raw HTML/CSS preservation, multilingual text and entities, large source documents, undo/redo, history retention during remount reconfiguration, and external document synchronization. No formatting, DOM serialization, API contract changes, or page-content writes were introduced by this editor enhancement.
