<!-- Copilot / AI agent instructions for the PhishNet static frontend -->
# Copilot instructions — PhishNet (frontend)

## Purpose
Help contributors and AI agents quickly understand the frontend: a static, client-side web app that implements UI, auth state, and simulated phishing scanning entirely in the browser.

## Big picture
- **Static multi-page site**: each page is an HTML file ([index.html](index.html), [dashboard.html](dashboard.html), [login.html](login.html), [signup.html](signup.html), [reports.html](reports.html), etc.)
- **Single central JS bundle**: [app.js](app.js) contains all client logic (auth, navigation, forms, scan simulation). Most behavioral changes live here.
- **No backend integration**: scans are simulated via `ScanManager.simulateScan()` and all state is stored in `localStorage`
- **Vanilla JavaScript**: no frameworks (React, Vue, etc.) — pure class-based architecture
- **Chart.js integration**: [dashboard.html](dashboard.html) uses Chart.js 4.4.0 from CDN for threat analytics visualizations

## Key files & architecture

### Core JavaScript ([app.js](app.js) — 812 lines)
Four manager classes control all behavior:
- **`AuthManager`**: handles login state, profile storage (localStorage: `phishnet_user`), scan count tracking (`phishnet_scan_count`), and guest limitations
- **`NavigationManager`**: dynamically renders nav links (logged-in vs guest), handles dropdowns, user avatar menu, and dashboard button visibility
- **`ScanManager`**: processes URL/email scans, shows notifications, renders scan result modals, enforces guest scan limits (1 scan max)
- **`FormManager`**: manages login (two-stage: email→password), signup (with password strength meter), and settings forms

Global initialization at line 775:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const nav = new NavigationManager();
  const scanner = new ScanManager();
  const forms = new FormManager();
});
```

### Styling ([styles.css](styles.css) — 2632 lines)
- **Theme**: Blue/Black cybersecurity aesthetic with CSS variables at `:root` (lines 1-50)
- **Key colors**: `--primary-blue: #0B63D9`, `--accent-cyan: #00B7D9`, threat colors (`--color-safe`, `--color-malicious`, `--color-suspicious`)
- **Gradients**: `--gradient-primary` (dark blue), `--gradient-header` for consistent brand feel
- **Animations**: `.animate-fade-in`, `.swipe-up-in`, `.swipe-up-out` for form transitions

### HTML pages
- All pages share common header/nav structure — [NavigationManager](app.js#L69-L238) dynamically rewrites `.nav-links` based on auth state
- Form IDs are contract points: `#login-form`, `#signup-form`, `#url-input`, `#email-input` — renaming breaks JS handlers
- Hero typewriter effect on [index.html](index.html): runs at line 784-812 of [app.js](app.js) via `#hero-typewriter[data-text]`

## Discoverable conventions

### Auth & state management
- **localStorage keys**: `phishnet_user` (user profile + email), `phishnet_scan_count` (total scans performed)
- **CRITICAL typo**: Line 3 of [app.js](app.js) uses `localStorage.getItem('pishnet_user')` (missing "h") for early dashboard button hiding, while `AuthManager` uses `phishnet_user` — inconsistency exists but works
- **Guest restrictions**: `AuthManager.canScanAsGuest()` returns true only if scan count is zero; subsequent scans redirect to [login.html](login.html)
- **Profile data**: stored as JSON with fields `{email, initials, loginTime, firstName?, lastName?}`

### Login flow (two-stage pattern)
Controlled in `FormManager.setupLoginForm()` (lines 398-577):
1. **Email stage**: user enters email, validated via regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
2. **Password stage**: email field swipes out, password field swipes in with `swipe-up-in`/`swipe-up-out` animations
3. Auth links toggle: `#authLinksEmail` (visible during email) swaps to `#authLinksFull` (visible during password, includes forgot/use different email/signup)
4. Back navigation: "Use different email" link triggers `backToEmailStage()` — reverses animation and UI state

### Signup flow
Located in `FormManager.setupSignupForm()` (lines 579-744):
- **Password strength meter**: 4-bar UI updated via `passwordScore()` function (lines 606-621)
  - Score 0-1 = Weak (red), 2 = Fair (orange), 3 = Good (yellow), 4 = Strong (green)
  - Minimum accepted: score ≥3 (Good) enforced at line 720
- **Show passwords checkbox**: toggles both password and confirm fields between `type="password"` and `type="text"`
- Creates account by calling `auth.setProfile()` then `auth.login()` — immediate redirect to [dashboard.html](dashboard.html)

### Scan simulation
`ScanManager.simulateScan()` (lines 327-343):
- Random threat classification: `['safe', 'suspicious', 'malicious']` with weighted confidence scores
- Returns result object: `{type, value, threat, confidence, timestamp, indicators[]}`
- Indicators are realistic messages mapped by threat level in `getIndicators()` (lines 345-353)
- Result shown in modal with `showScanResult()` (lines 355-385) — styled badges with `.scan-result-badge.badge-{threat}`

### Navigation updates
`NavigationManager.updateNavigation()` (lines 77-137):
- Runs on every page load to sync nav bar with auth state
- Logged-in users see: Dashboard, Reports, Blog, Demo, Pricing, About dropdown
- Guest users see: Pricing, Demo, Blog, About dropdown
- Dashboard button (.btn-dashboard) hidden for logged-in users via `display: none` at line 113
- User avatar displays initials from `auth.getUser().initials` — computed from email in `AuthManager.getInitials()` (lines 41-48)

### Dropdowns & menus
- **Navigation dropdowns**: activated via `.dropdown-toggle` click, managed in `setupDropdowns()` (lines 205-216)
- **Profile menu**: dynamically injected on avatar click in `toggleProfileMenu()` (lines 218-252) — includes Settings link and Logout button

## Developer workflows

### Local development
No build step — pure static files:
```bash
# Serve with Python
python -m http.server 8000

# Or Node.js
npx http-server -c-1 .
```
Open http://localhost:8000 — changes to [app.js](app.js) or CSS require browser refresh.

### Debugging tips
- **Auth issues**: Check browser localStorage for `phishnet_user` and `phishnet_scan_count` keys
- **Form not working**: Verify form ID matches selector in [app.js](app.js) (e.g., `#login-form`, `#signup-form`)
- **Nav not updating**: Ensure `NavigationManager` runs — check DOMContentLoaded listener at line 775
- **Scan modal not appearing**: Open console for errors in `ScanManager.showScanResult()` — modal is appended to `document.body`

### Testing approach
No automated tests exist. Manual testing checklist:
1. Guest flow: scan once (should work), try second scan (should redirect to login)
2. Login: test email validation, two-stage transition, "use different email" back button
3. Signup: verify password strength meter, enforce Good/Strong requirement, check password match validation
4. Navigation: verify logged-in vs guest nav differences, dropdown menus, profile menu
5. Dashboard: ensure Chart.js renders (requires CDN connection)

## Integration points & extension notes

### Adding backend integration
Current architecture expects these changes:
1. **Replace `ScanManager.simulateScan()`** with `fetch()` to POST scan requests:
   ```javascript
   async handleScan(input, type) {
     const response = await fetch('/api/scan', {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({value: input.value, type})
     });
     const result = await response.json();
     this.showScanResult(result); // Keep existing modal UX
   }
   ```

2. **Move auth to backend**: replace `AuthManager` localStorage calls with session cookies or JWT tokens

3. **Preserve UI contracts**: keep existing notification/modal patterns — `ScanManager.showNotification()` and `showScanResult()` should remain unchanged to preserve UX

### External dependencies
- **Chart.js 4.4.0**: loaded from CDN in [dashboard.html](dashboard.html#L14) — used for threat analytics pie/bar charts
- **Google Fonts**: Inter, Orbitron, Roboto Mono, Sora — loaded via `<link>` tags in each HTML file

## Quick reference examples

### Change login page heading
Edit [login.html](login.html#L52-L56) `.login-card-header` section.

### Adjust scan guest limit
Modify `AuthManager.canScanAsGuest()` at [app.js](app.js#L63-L65):
```javascript
canScanAsGuest() {
  return this.getScanCount() < 3; // Allow 3 scans instead of 1
}
```

### Add new nav link (logged-in users)
Edit `NavigationManager.showLoggedInNav()` at [app.js](app.js#L140-L158) — insert new `<li>` item.

### Customize scan result modal
Modify `ScanManager.showScanResult()` template at [app.js](app.js#L355-L385).

### Update theme colors
Change CSS variables at [styles.css](styles.css#L6-L24) — affects entire app.

## Known quirks / gotchas
- **Typo on line 3**: `localStorage.getItem('pishnet_user')` missing "h" in key name — but isolated to early dashboard button hiding
- **ID/class coupling**: DOM element IDs are tightly coupled to [app.js](app.js) selectors — renaming requires parallel JS updates
- **Animation timing**: Form stage transitions use setTimeout delays (e.g., 420ms at line 476) — changing animation CSS requires matching JS timing
- **Global `auth` object**: Exposed at line 812 (`window.auth = auth`) for inline event handlers like `onclick="auth.logout()"` in profile menu
- **Chart.js CDN dependency**: [dashboard.html](dashboard.html) breaks if CDN is unreachable — consider vendoring for offline use

---
**Need help?** Ask about specific features (e.g., "How does the password strength meter work?", "How to add backend API calls?", "Where to customize navigation?")
