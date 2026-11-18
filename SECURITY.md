# Security & data rules: StayStrong50

Type: Static strength-check app for adults 50+ (data stays in the browser)  
Last reviewed: 18 Nov 2026  
Owner: Entwisle Fitness / Ao Sato

These are the 5 documents written before (or reviewed after) building. Update this file whenever the app gains a login, a form, a database or a new third-party service.

## 1. Security rules

- No database or server code: the site is static files served by Vercel.
- No passwords, API keys or tokens in the code. Public IDs only (GA4 measurement ID).
- Any text inserted into pages with innerHTML is our own content or escaped first.
- Security headers set in vercel.json: nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy, HSTS and a Content-Security-Policy.
- Dependencies: Dependabot opens update PRs monthly where the repo has packages (npm/pip/GitHub Actions).

## 2. Login rules

- Who signs in: Nobody signs in. There are no accounts, roles or admin area.
- How long they stay in: Not applicable.
- What each person can see: Every visitor sees the same public pages. Anything personal stays in that visitor's own browser.

## 3. Data rules

- Answers and plan saved in the visitor's browser (localStorage) only.
- Analytics only after cookie consent.
- Third parties that receive data: Google Analytics 4 (after consent).
- Deletion: Visitor clears data in the app or by clearing site data in the browser.
- Law: UK GDPR + PECR (cookies). EU visitors: EU GDPR. Card numbers are never stored.

## 4. Threat map

| Entry point | Risk | Notes |
|---|---|---|
| App script | Low | Static files, CSP set |
| Browser storage | Low | Health-adjacent answers stay on the device |

## 5. Launch checklist

- [ ] Security rules above are true for the live site
- [ ] Login rules: attempt limit + session expiry (if any login)
- [ ] Data rules: privacy policy names every third party; consent banner before analytics/ads
- [ ] Threat map reviewed; every High item fixed or accepted in writing
- [ ] UK legal & compliance checklist done (privacy, cookies, terms, business details, accessibility)
- [ ] Security headers verified on the live domain (securityheaders.com)
