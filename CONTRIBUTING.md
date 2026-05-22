# Contributing to Pharmacy Logistics System

Thank you for helping improve the **Ehafo Clinic Pharmacy Logistics System**! This is a clinic-specific project, but contributions from the development team are warmly welcome.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Report Issues](#how-to-report-issues)
3. [Development Setup](#development-setup)
4. [Branching Strategy](#branching-strategy)
5. [Making Changes](#making-changes)
6. [Code Style](#code-style)
7. [Testing](#testing)
8. [Submitting a Pull Request](#submitting-a-pull-request)
9. [Security Policy](#security-policy)

---

## Code of Conduct

Be respectful, collaborative, and professional. Patient safety depends on this software — take quality seriously.

---

## How to Report Issues

Use the GitHub issue templates:

- **Bug** → `.github/ISSUE_TEMPLATE/bug_report.yml`
- **Feature Request** → `.github/ISSUE_TEMPLATE/feature_request.yml`
- **Security** → `.github/ISSUE_TEMPLATE/security_issue.yml` (or email admin for critical issues)

---

## Development Setup

### Prerequisites

- Node.js 18+ (for local tooling)
- A Firebase account (for connecting to your own dev project)
- A modern browser (Chrome or Firefox recommended)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/ellin72/Pharmacy-Logistics.git
cd Pharmacy-Logistics

# 2. Set up your own Firebase dev project
#    - Go to https://console.firebase.google.com
#    - Create a new project (do NOT use the production project for dev)
#    - Enable Firestore, Authentication (Email/Password), and Hosting

# 3. Copy your dev Firebase config into frontend/js/config.js
#    ⚠️  NEVER commit production credentials

# 4. Deploy Firestore security rules (use your dev project)
#    Copy docs/FIRESTORE_RULES_FINAL.rules into Firebase Console > Firestore > Rules

# 5. Serve the app locally
npx http-server frontend -p 8000
# or
python -m http.server 8000 --directory frontend
```

### Using a `.env` file (optional)

The app currently uses a `config.js` file for Firebase config. If you want to manage config via environment variables, you can create a `.env` file (it is gitignored):

```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Direct pushes restricted. |
| `develop` | Integration branch for next release. |
| `feature/<name>` | New features (branch from `develop`) |
| `fix/<name>` | Bug fixes (branch from `develop` or `main` for hotfixes) |
| `docs/<name>` | Documentation-only changes |

### Examples

```bash
git checkout develop
git pull origin develop
git checkout -b feature/dispense-history-filter
# … make changes …
git push origin feature/dispense-history-filter
# Open a PR targeting `develop`
```

---

## Making Changes

### Small, focused PRs

Keep PRs small and focused on **one** concern. A PR that fixes a bug AND refactors a module is harder to review and riskier to merge.

### Before you code

1. Check the [Issues](https://github.com/ellin72/Pharmacy-Logistics/issues) tab — someone may already be working on it.
2. Create or comment on an issue to signal your intent.
3. If adding a new Firestore collection, update `docs/FIRESTORE_RULES_FINAL.rules` and `database/schema.md`.

### File conventions

| What | Where |
|------|-------|
| New page | `frontend/<name>.html` |
| Page logic | `frontend/js/<name>.js` |
| Shared utilities | `frontend/js/validation.js`, `frontend/js/reports.js`, etc. |
| Styles | `frontend/css/styles.css` (use CSS variables, not hardcoded colours) |
| Documentation | `docs/<TOPIC>.md` |

---

## Code Style

We use **vanilla JavaScript (ES6+)**, not a framework. Follow these guidelines:

### JavaScript

- Use `const`/`let`, not `var`.
- Use `async/await` for Firebase calls (not raw `.then()`).
- Sanitize all user input with `sanitizeText()` from `js/validation.js` before storing to Firestore.
- Validate inputs with the helpers in `js/validation.js`.
- Escape HTML with `escapeHtml()` before rendering user data into the DOM.
- Log errors with `console.error()`, not `console.log()`.
- Do not expose secrets or patient data in console output.

### HTML

- All pages must have `lang="en"`, a meaningful `<title>`, and a `<meta name="viewport">`.
- Use semantic HTML: `<main>`, `<nav>`, `<button>`, `<label>`, etc.
- Form inputs must have a matching `<label for="…">`.
- Include `aria-required="true"` on required form fields.
- Add a `<a class="skip-link" href="#main-content">Skip to main content</a>` on every page.

### CSS

- Use CSS custom properties (variables) from `:root` — never hardcode colours.
- Add new variables to `:root` if you need a new colour.
- Mobile-first: use `min-width` media queries.

---

## Testing

There is currently no automated test suite (this is a roadmap item). For now:

### Manual QA checklist for every PR

- [ ] Login and logout work correctly.
- [ ] Changes work on mobile (375px viewport).
- [ ] All form fields validate correctly (test empty, too-long, invalid inputs).
- [ ] Firestore operations succeed and are visible in Firebase Console.
- [ ] No unhandled JS errors in the browser console.
- [ ] Print layout renders correctly (use browser Print Preview).
- [ ] Offline: disable network, confirm app shows "Offline" banner and queues operations.

### New feature test scenarios

| Feature | Test scenario |
|---------|--------------|
| Dispense | Try dispensing more than available stock — should be rejected |
| Dispense | Dispense from an expired medicine — should be blocked |
| Supplier | Save with empty name — should show validation error |
| Analytics | Switch date range — consumption table should update |

---

## Submitting a Pull Request

1. Ensure your branch is up to date with the target branch.
2. Run the manual QA checklist above.
3. Open a PR with a clear description:
   - **What** changed and **why**
   - Link to related issue (`Closes #123`)
   - Screenshots for any UI changes
4. Request a review from a maintainer.
5. Address review feedback — do not merge your own PRs.

---

## Security Policy

- **Never commit Firebase credentials** for the production project.
- Use a **separate Firebase dev project** for development and testing.
- Always update `docs/FIRESTORE_RULES_FINAL.rules` when adding new collections.
- For critical security vulnerabilities, **do not file a public GitHub issue** — contact the project administrator directly.
- All user input **must** be sanitized with `sanitizeText()` from `validation.js` before being written to Firestore.
- All dynamic HTML must be escaped with `escapeHtml()` to prevent XSS.

---

## Questions?

Open a [GitHub Discussion](https://github.com/ellin72/Pharmacy-Logistics/discussions) or file an issue. Thank you for contributing!
