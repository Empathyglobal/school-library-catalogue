# Release verification

Source reviewed 5 November 2026; browser verification updated 6 November 2026. These are bounded checks, not a guarantee of legal clearance, complete accessibility or absence of security defects.

## Passed

- Independent review of all 1,026 source records: exact expected schema; no descriptions, excerpts, contact addresses, private hosted URLs, borrower/staff records, suspicious markup or recognized credential patterns found.
- Source comparison preserves every bibliographic/inventory field and record order. The only dataset change blanks all 1,024 nonempty cover fields.
- The clean release excludes original JPGs, SQL/import tools, uploaded archive references, personal environment paths, private Git objects, raw dumps and operational deployment instructions.
- Seventeen Node.js tests pass: full schema/count checks, catalogue facts, script syntax/CSP hash, local-only loading, pagination, author/multi-term search, subject filtering, details/closing, escaping and ignored remote covers, accent-insensitive matching, malformed/duplicate records, failed HTTP loads, initial/same-document links and queued dialog-close/navigation races.
- No runtime npm package, third-party JavaScript bundle or font package is included.

## Browser verification

[GitHub Actions run 42167377259](https://github.com/Empathyglobal/school-library-catalogue/actions/runs/42167377259) completed successfully for source commit `d6ce79e0c87e797af7803d63068b80e298860dda` on 6 November 2026. It ran all 17 Node tests and the real-browser suite with Node.js 22.23.4, Playwright 1.64.1 and Chromium 156 on an Ubuntu GitHub-hosted runner.

The browser suite passed at desktop (1280 × 900) and phone-sized (390 × 844) viewports. Each viewport covered pagination, search, subject filters, details, Escape, keyboard activation, Close, same-document deep links, Back/Forward, invalid fragments, rapid close followed by newer navigation, rapid reopening, backdrop dismissal and initial-load deep links. Separate fixtures verified escaped text, prototype-like subject names, ignored remote cover URLs and rejection of malformed data. No JavaScript/console errors or external requests were recorded. Catalogue and detail screenshots were saved as the run's seven-day artifact.

The initial local cloud-runtime attempt could not launch Chromium because its process-singleton socket was denied. Browser checks subsequently ran on GitHub's hosted test runner. Early CI runs exposed a real asynchronous dialog-close race: an old close event could erase a newer book fragment before its navigation handler ran. The fix clears the old route synchronously on user dismissal and leaves navigation-driven closure alone. Regression tests model queued close events and exercise rapid navigation in Chromium.

These checks cover the listed Chromium flows and viewport sizes, not physical mobile devices, other browser engines, or a complete accessibility/security audit. The Node DOM double is a separate check and does not replace the browser suite.

## Publication checks

The publisher verifies the new public Git tree against the final release manifest and checks an anonymous clone before reporting completion. This document describes the prepared source; the actual public commit records publication. No production deployment or original-repository mutation is part of this release.

