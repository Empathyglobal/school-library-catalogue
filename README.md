# Empathy School Library Catalogue

A searchable, reusable school library catalogue created by **Eric Gonzalez-Payne / Empathy Global**. It combines a plain HTML/CSS/JavaScript interface with **1,026 factual book records** from Empathy School Bali. [EricGP.com](https://ericgp.com/) · [GitHub source](https://github.com/Empathyglobal/school-library-catalogue)

Search by title, author or subject, filter by subject, browse paginated results, and open details showing publisher, publication year, ISBN, call number and recorded copy count. No account, API key, package installation or application backend is required.

## Public snapshot

This is a separate, sanitized source release. The catalogue was exported on **25 September 2026**; its 1,095 recorded copies are historical inventory counts, not current borrowing availability. The original private repository and live catalogue were not changed by this release.

All 1,026 records remain. The export has no book descriptions or excerpts, so none have been invented or added. There are no borrower/member records, staff accounts, loans, passwords or raw database exports. The original 1,024 cover images are excluded because redistribution rights were not established. Every record uses a coloured title placeholder instead; the interface never loads a cover URL.

See [catalogue rights and data quality](CATALOGUE-NOTICE.md), [provenance and development record](PROVENANCE.md), and [verification](VERIFICATION.md).

## Run locally

Serve this directory with any static web server. For example, with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` in a modern browser. Directly opening the HTML as a file may prevent the browser from fetching `books.json`. No build step is needed. Publishing on a static host is optional and separate from this source release.

## Reuse with another library

Replace `books.json` with a reviewed JSON array using the same ten fields. Each `id` must be a unique positive safe integer; `copies` must be a nonnegative safe integer. `authors` and `subjects` are arrays of strings; all other fields except `id` and `copies` are strings. Keep `cover` empty. The frontend rejects malformed records, escapes displayed text, ignores unknown fields and ignores all supplied cover references.

Only publish metadata you are allowed to share. Do not place an SQL backup, borrower details, loan histories, credentials, images without redistribution permission or unlicensed descriptions in this directory. The original SQL/image migration scripts are intentionally omitted. Updating this public snapshot does not update the school's live catalogue.

## Privacy and security

Search runs in the browser. The application fetches only the adjacent `books.json`; it has no analytics, cookies, local storage, remote fonts, image services or application APIs. The catalogue is intentionally public. Clicking an external footer link is a separate navigation to that site, and ordinary hosting access logs are controlled by the chosen host.

A restrictive Content Security Policy allows same-origin catalogue requests and the reviewed script while blocking images and form submissions. If you edit the inline script, update its SHA-256 CSP hash and rerun the tests. The Node test checks that the hash matches. This is a small static application, not a security certification.

## Tests

With Node.js 22 or newer:

```sh
node --test tests/catalogue.test.cjs
```

Seventeen Node tests check all records, schema, safe rendering, search, pagination, filters, detail/close behavior, fragment navigation, queued close events, malformed data, failed loads and the script policy. These use a DOM test double with explicitly queued native close events.

GitHub Actions also runs `tests/browser-smoke.cjs` with Playwright 1.64.1 and Chromium. It checks desktop and phone-sized layouts, keyboard interaction, initial and same-document deep links, Back/Forward, repeated and interrupted dialog flows, escaped text, malformed data and absence of external requests. To run that suite separately:

```sh
npm install --no-save --package-lock=false --ignore-scripts playwright@1.64.1
npx --no-install playwright install chromium
node tests/browser-smoke.cjs
```

The application itself still has no npm dependencies. See [VERIFICATION.md](VERIFICATION.md) for the passing CI evidence and scope.

## License and attribution

Original code and documentation are [MIT licensed](LICENSE), copyright (c) 2026 **Eric Gonzalez**. Professional attribution is **Eric Gonzalez-Payne**. Any rights held in this catalogue's original selection or arrangement are included under the same permission; no rights in the underlying books, artwork, third-party text, trademarks or publisher materials are granted. See CATALOGUE-NOTICE.md before republishing or extending the dataset.

