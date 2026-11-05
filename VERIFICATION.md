# Release verification

Reviewed 5 November 2026. These are bounded checks, not a guarantee of legal clearance, complete accessibility or absence of security defects.

## Passed

- Independent review of all 1,026 source records: exact expected schema; no descriptions, excerpts, contact addresses, private hosted URLs, borrower/staff records, suspicious markup or recognized credential patterns found.
- Source comparison preserves every bibliographic/inventory field and record order. The only dataset change blanks all 1,024 nonempty cover fields.
- The clean release excludes original JPGs, SQL/import tools, uploaded archive references, personal environment paths, private Git objects, raw dumps and operational deployment instructions.
- Eleven Node.js tests pass: full schema/count checks, catalogue facts, script syntax/CSP hash, local-only loading, pagination, author/multi-term search, subject filtering, details/closing, escaping and ignored remote covers, accent-insensitive matching, malformed/duplicate records and failed HTTP loads.
- No runtime npm package, third-party JavaScript bundle or font package is included.

## Browser limitation

A reproducible optional Playwright test covers desktop and phone layouts, keyboard interaction, search/filter/pagination, deep links, repeated dialog entry/close, malformed data and blocked external requests. The installed Chromium could not launch in the cloud runtime: its process-singleton socket was denied with `Operation not permitted`. A permitted retry had the same result. No browser test case ran, and no visual, mobile, accessibility or end-to-end browser pass is claimed.

`tests/catalogue.test.cjs` runs the actual inline script with a small DOM test double. Those passing checks do not replace real browser testing. The original interface was preserved except for public-snapshot wording, attribution, cover removal, schema validation, safe subject counting and the content security policy.

## Publication checks

The publisher verifies the new public Git tree against the final release manifest and checks an anonymous clone before reporting completion. This document describes the prepared source; the actual public commit records publication. No production deployment or original-repository mutation is part of this release.
