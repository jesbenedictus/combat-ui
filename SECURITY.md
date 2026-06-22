# Security Policy

`@combat-ui/core` (Combat UI) is a client-side web component framework. It ships
HTML, CSS, and JavaScript that run in the browser; it has no server component and
handles no credentials of its own. Security issues are therefore most likely to be
client-side concerns such as DOM-based XSS, unsafe HTML injection through component
attributes or slots, prototype pollution, or vulnerabilities pulled in through
dependencies.

## Supported Versions

Combat UI is pre-1.0 and under active development. Only the most recent minor
release line receives security fixes; older `0.x` lines are not maintained.

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

Once the project reaches a stable `1.0` release, this table will be updated to
reflect a longer-term support window.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, use one of the following private channels:

- **Preferred:** Open a private report via GitHub Security Advisories at
  <https://github.com/Combat-Marketing/combat-ui/security/advisories/new>.
- **Email:** Contact the maintainers at @h4rdc0m and @jesbenedictus.

Please include as much of the following as you can:

- A description of the vulnerability and the impact you believe it has.
- The affected component(s) and version of `@combat-ui/core`.
- Steps to reproduce, ideally with a minimal HTML/JS snippet or repository.
- Any proof-of-concept, screenshots, or logs that help us understand the issue.

## What to Expect

- **Acknowledgement:** We aim to acknowledge your report within **5 business days**.
- **Assessment:** We will investigate and let you know whether the report is
  accepted as a vulnerability, typically within **10 business days** of
  acknowledgement, along with an initial severity assessment.
- **Updates:** We will keep you informed of progress at least every **10 business
  days** while we work on a fix.
- **Resolution:** Accepted vulnerabilities will be fixed in a new release of the
  supported version line. We will coordinate a disclosure timeline with you and,
  unless you prefer otherwise, credit you in the release notes and any published
  advisory.
- **Declined reports:** If we determine the report is not a vulnerability (for
  example, expected behaviour or out of scope), we will explain our reasoning so
  you can follow up if you disagree.

We ask that you give us a reasonable opportunity to resolve an issue before any
public disclosure, and that testing does not involve attacks against other users,
denial of service, or any activity beyond what is needed to demonstrate the issue.

Thank you for helping keep Combat UI and its users safe.
