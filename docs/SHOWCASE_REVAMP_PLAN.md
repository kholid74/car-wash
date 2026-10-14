# Showcase revamp implementation plan

Source of truth: `brief_1.md`, including agreed scope clarifications on 12 October 2026. Work in verified phases. No database, production authentication or external messaging integration.

Current progress: Phases 0–4 complete. Next task: Phase 5, polish and final verification. Verification below is recorded per phase; earlier version-1 observations are historical.

## Decisions and routes

- Public `/`; full Phase 3 routes `/layanan`, `/layanan/[slug]`, `/booking`, `/membership`, `/tentang`, `/kontak`.
- `/admin/login`: clearly labeled demo credentials; tab-scoped local session. `/admin` and all `/admin/...` require that demo session. Logout clears it. This is UI simulation, not security.
- Move existing operational routes under `/admin`; redirect old paths to preserve bookmarks. Keep `/display/queue` public and independent of the admin layout.
- Core pages added progressively: `/admin/cashier`, `/admin/work-orders`, `/admin/quality-control`, `/admin/reservations`.
- Secondary showcase pages in Phase 4: `/admin/promotions`, `/admin/feedback`, `/admin/roles`, `/admin/payments`, `/admin/notifications`, `/admin/website`. Minimum: seeded rows/settings, a working detail/edit/toggle/preview interaction and explicit local feedback; no backend effects.

## Phase 0 — audit and planning

- [x] Read brief, instructions, source tree, models, state, seed, styles, test scripts and relevant installed Next.js routing/client-component guides.
- [x] Record implemented workflows, missing modules, dependencies and risks in `SHOWCASE_REVAMP_AUDIT.md`.
- [x] Establish route, migration, scope and validation decisions here.
- [x] Run baseline domain tests: 13 passed.

## Phase 1 — design system, shell and dashboard

- [x] Public entry page, admin namespace, login/logout simulation and legacy redirects.
- [x] Grouped sidebar, useful list entry points for cashier/work orders/QC; all visible links work.
- [x] Refine existing tokens: charcoal #111827, canvas #F5F7FA, blue #2563EB; readable success/warning/danger text; 8–14px radii and restrained borders/shadows. Keep system font stack and existing components.
- [x] Six KPIs: paid revenue today, vehicles ready/completed today, all queued vehicles, active work orders, average wash-to-ready duration for completed service today, currently available bays.
- [x] Live queue including overnight work, occupancy, actionable alerts, seven-day revenue and service popularity, latest payments. Upcoming reservations joins in Phase 3 when the model exists.
- [x] Responsive checks at desktop 1440px, tablet 768px, mobile 390px; keyboard-accessible navigation and login feedback.
- [x] Lint, typecheck, unit tests, build, E2E golden path and admin/login/dashboard checks. Results below.

Acceptance: root is public; direct admin and legacy URLs lead through demo login; refresh preserves session; logout removes access; metrics reflect state mutations; original golden path and saved v1 data still work. No production-auth claim.

## Phase 2 — core operations and data foundation

- [x] Improve check-in with existing-customer vehicle registration; refine inspection, queue, work-order and POS layouts while retaining validations.
- [x] Add branch/bay foundation before booking. Version 2 migration assigns old orders to the original branch; preserve all v1 arrays/IDs/prices/photos and queue counter. Keep original storage key for migration discovery.
- [x] Introduce branch identity, opening hours and bay count; branch-specific order selection and occupied-bay validation. Original branch inherits settings. Keep customer/vehicle catalog shared unless a real showcase need requires otherwise.
- [x] Add staff assignment foundation where needed; map detailing as a display label within valid domain transitions.
- [x] Fix transaction date IDs; use rolling dates in affected tests. Duration timestamps must remain interpretable across old and new data.

Acceptance: v1 fixture migrates without data loss; golden path unchanged; manual prices, rejected transitions, duplicate check-in/payment and occupied bay covered. Verify before Phase 3.

## Phase 3 — public website and booking

- Expand public entry to all twelve brief sections and public routes, local optimized automotive images, demo branding/reviews, real navigation and shared service catalog.
- Reservation model: reference, branch, service/price snapshot, vehicle type, local date/slot, customer information, status, optional linked work order.
- Simple capacity: one-hour slots, one reservation per available bay per slot; pending and confirmed count; cancelled releases capacity. Default opening 08:00–17:00 Asia/Jakarta. Treat durations as showcase estimates, not advanced scheduling. Check current capacity again on submit/reschedule; never reserve past slots.
- Admin filters, confirm, reschedule, cancel and convert once to check-in; dashboard upcoming reservations uses the same store.
- Document single-browser scope and lack of device synchronization. Do not add production locking or integrations.

Acceptance: public booking appears in admin; full slot rejected; cancelled capacity reusable; reschedule cannot overbook; repeated conversion cannot duplicate work orders. E2E plus domain checks and responsive verification.

## Phase 4 — business showcase modules

- Membership tiers/status, points earning/redemption/history; guard against repeated earning or negative balances.
- Employees, active status, local attendance and assignments; basic per-service commission rules and earnings tied to paid orders.
- Inventory usage/adjustments and low stock; expenses with category/date and report summaries.
- Branch switch/management with scoped operations; customer/vehicle history remains intact.
- Secondary modules as local clickable showcases (see routes), including preview feedback; no pretend external actions.
- Extend reporting from shared data; label revenue less recorded expenses accurately, never as complete net profit.

Acceptance: each shown module has a demonstrable interaction; reset covers all added state; reports and history use store values; migration fixtures, essential domain checks and module smoke tests pass.

## Phase 5 — polish and final verification

- Public/admin/tablet/mobile/TV visual review, keyboard and dialogs, empty/loading/error states, reduced motion, local images and console checks.
- Full automated scripts and golden paths; note exact blockers, never claim unrun checks.
- Document credentials, presentation journey, reset, remaining assumptions and data limits.

## Phase verification log

Phase 0: complete. Source scope and dependency plan established; baseline unit tests 13/13.

Phase 1: implemented and verified on 12 October 2026. Next recommended phase: Phase 2, core operations and branch/bay migration foundation.

### Delivered

- `/` public entry; `/admin/login`, `/admin` and prefixed operational routes; legacy redirects and independent public `/display/queue`.
- Demo credentials: `admin@klautocare.demo` / `demo123`. Session survives refresh in the same tab. Logout clears the session; invalid credentials show a form error. Unsafe return URLs fall back to `/admin`.
- Dark grouped sidebar, light operational workspace, cashier/work-order/QC list pages reusing existing workflow actions.
- Six live metrics, overnight work visibility, bay occupancy, QC/payment alerts, paid-revenue chart, service popularity and recent payments.
- Responsive table containment, mobile queue row alignment, reduced-motion behavior and menu focus/Escape handling.
- Version 1 data and storage key preserved; no migration is needed until Phase 2.

### Files

- Added: `docs/SHOWCASE_REVAMP_AUDIT.md`, this plan, `src/app/page.tsx`, `src/app/[...path]/page.tsx`, `src/app/admin/[[...path]]/page.tsx`, `src/app/display/queue/page.tsx`, `src/app/showcase.css`, `src/components/demo-access.tsx`, `tests/showcase.mjs`.
- Replaced the root optional catch-all route with an explicit public home and legacy catch-all.
- Updated: `brief_1.md`, `package.json`, `src/app/layout.tsx`, `src/app/globals.css`, application/dashboard/operations/check-in/records components, `src/lib/domain.ts`, `tests/domain.test.ts`, `tests/demo.mjs`. Next.js regenerated its route type references in `next-env.d.ts` during build.
- Existing user change to `.gitignore` was not edited.

### Verification

- `npm test`: 14/14 passed, including dashboard overnight work, duration label compatibility, empty state and unchanged operational domain cases.
- `npm run typecheck`: passed after regenerating Next route types for the moved catch-all.
- `npm run lint`: passed.
- `npm run build`: passed; public home and queue display prerendered; admin and legacy routes generated.
- `BASE_URL=http://localhost:3001 npm run test:e2e`: all 17 checks passed, including login, A-012, inspection photo, Rp185.000 QRIS payment, receipt, history, dashboard revenue update, reset and console checks.
- `BASE_URL=http://localhost:3001 npm run test:showcase`: passed public/admin separation, invalid login, return URL, logout, preserved v1 storage, all 12 primary menu destinations, mobile Escape/focus and public masked queue display; no browser errors.
- Desktop/tablet/mobile screenshots captured in ignored `test-results/`; dashboard screenshots at 1440, 768 and 390px visually reviewed. Public and login desktop screenshots reviewed. No page-wide horizontal overflow in public/admin at the checked widths; tables scroll inside their containers.
- Initial checks caught a moved import, stale generated route types, an overly broad alert locator, hidden table-label overflow and reduced-motion menu focus timing. These were corrected before the successful runs.

### Limits

- Public entry is intentionally the Phase 1 foundation. Full service pages, automotive photography, online booking and upcoming reservations remain Phase 3.
- Secondary clickable modules and business management remain Phase 4; they are not shown as dead menu items in Phase 1.
- Demo login is a client UI simulation, not real access protection. Local state does not synchronize across devices; no DB, external payments or messaging.
- No production deployment, real authentication, physical receipt printer or real TV hardware validation was performed. Financial/date-ID improvements identified in the audit remain Phase 2.

## Phase 2 verification — 13 October 2026

### Delivered

- Check-in can select an existing customer/vehicle or register another vehicle under an existing owner. Duplicate plates and a vehicle already active at another branch are rejected; customer history remains shared.
- Inspection groups have responsive spacing, initial-condition notes and keyboard-accessible photo upload. Existing recommendations, photos, quantities, discounts, manual prices and approval flow remain functional.
- Five queue columns: waiting, washing, detailing, QC and ready. Detailing is a visual grouping of `WASHING` jobs containing the detailing service, so status transitions remain unchanged. Cards show optional branch staff assignment and estimated service duration/ready time.
- Work-order lists include final prices and status filtering; details show branch, assigned employee, estimate and preserved timeline. POS lists show ready vehicles and total open charges; payment/receipt retain manual totals, cash change and simulated noncash methods.
- Version 2 adds two demo branches, opening/closing hours, branch bays and three staff records. Existing branch details come from saved settings. Dashboard, operational lists, transactions, reports, bay checks and public queue display use the selected branch. Viewing a different branch's order offers an explicit switch.
- Automatic v1 migration preserves IDs, complete orders, historical transactions, catalog, customer/vehicle records, photos and queue counter, using the original `kalsara-car-wash-v1` storage key. Invalid saved data stays intact and offers a download/recovery screen; reset requires an explicit confirmation. Failed migration writes or edits show storage feedback without overwriting the original.
- Payment IDs use the actual Jakarta payment date and advance beyond the highest existing suffix, including gaps. Historical IDs stay untouched. Unpaid transaction totals use the same manual-price-aware calculation as POS.

### Files and verification

- Added `src/lib/migration.ts`, `src/components/order-branch.tsx`, `tests/fixtures/demo-v1.json`, `tests/operations.mjs`, and `test:operations` script. Updated domain/seed/store, operational views, shell, settings, CSS, existing tests and documentation. No dependency added.
- `npm test`: 21/21 passed, including v1/v2 migration, customer reuse, branch isolation, bay collisions, staff validation, detailing transitions, old/new timeline estimates, branch settings, manual payment and duplicate prevention.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed. Final build includes TypeScript validation. Node's existing module-type inference warning during the test command does not fail tests.
- `npm run test:e2e`: golden path passed all 17 checks (A-012, Rp185.000, photo, QRIS, display masking, receipt, history, dashboard and reset).
- `npm run test:showcase`: public/admin separation, login/logout, saved v2 state, navigation, responsive shell and public display passed.
- `npm run test:operations`: passed fixture migration in the browser, invalid/valid branch settings, existing-owner registration, branch-specific Bay 1 usage, staff assignment, detailing to QC, manual Rp275.000 payment, change and branch receipt, scoped transactions/dashboard, work-order filter, cross-tab display updates, foreign-branch switching, recovery/reset and simulated full-storage preservation.
- Browser checks used the already-running `http://localhost:3000` server. Screenshots cover check-in, inspection, queue, POS list/payment and work-order detail at 1440, 768 and 390px without page-wide horizontal overflow. Queue/POS desktop, inspection mobile and payment tablet screenshots were visually reviewed. The visual pass corrected panel-heading wrapping, staff-select containment and queue spacing. Screenshots remain under ignored `test-results/`.

### Intentional limits and next phase

- One local browser store; selected branch and display privacy setting are shared across its tabs. The public display follows the admin's branch switch. No cross-device synchronization or concurrent-operator protection.
- Global queue counter continues across branches; only the prefix differs. Staff assignment is optional. Branch/employee creation, attendance and commissions remain Phase 4.
- Opening hours are editable groundwork for booking; walk-in operations are not blocked outside those hours. Estimates sum current catalog durations after work starts; they do not model waiting, parallel tasks or guaranteed completion times.
- No deployment or physical printer/TV testing. Login and payment remain demo simulations without DB access.
- Phase 3 can now build richer business management modules on this branch, bay and reservation foundation.

## Phase 3 verification — 14 October 2026

### Delivered

- The public root now uses the complete KL Autocare automotive site with the twelve brief sections, locally stored photography, Indonesian copy, catalog pricing, branch details and links to service, membership, about, contact and booking pages. Reviews and contact details are labeled as illustrative demo content.
- Booking selects a catalog service, vehicle, branch, date, one-hour slot and customer/vehicle details. It writes locally with a reference number and price snapshot. Capacity counts pending and confirmed requests per bay, rejects past/closed/full slots and releases canceled slots.
- Admin reservations are branch-scoped and support date/status filters, confirmation, rescheduling with capacity checks, cancellation, and one-time conversion into an inspection/work order. Upcoming reservations use the same local store.
- v2 demo data migrates to v3 with an empty reservation list; v1 migration and existing operational records remain covered. The store waits until hydration before loading browser data, and booking query choices arrive through the current Next.js route props.
- The booking flow documents the localStorage, single-browser limitation. No database, real messaging, or publishing was added.

### Verification

- `npm test`: 23/23 domain tests pass, including migration, capacity/date validation, cancellation, price snapshots and one-time conversion.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run test:e2e`: all existing operational golden-path steps pass, including A-012, Rp185.000, payment, queue, history, reset and console checks.
- `npm run test:operations`: branch/migration and responsive operational flow passes.
- `npm run test:booking`: public sections and routes, v2 migration, slot capacity, reservation filters, confirm/reschedule/cancel, one-time check-in conversion, confirmation, dashboard, responsive public/booking/admin and hydration checks pass.
- `npm run test:showcase`: passed login, old URLs, navigation and responsive behavior; no browser errors.
- Public image sources, Pexels license and optimization details are recorded in `docs/PUBLIC_IMAGE_CREDITS.md`.

### Intentional limits

- Reservations live in this browser's localStorage and do not synchronize across devices or protect against concurrent writes. Admin login is a visual demo gate; contact actions do not send messages.
- Showcase login, notification, promotion and payment settings are local demonstrations. Production deployment, real authentication, message delivery and payment processing remain out of scope.

## Phase 4 verification — 14 October 2026

### Delivered

- Membership tiers, point grants/redemptions and point history; employee directory, active status and daily attendance; service commission percentages and employee earnings estimates.
- Branch-scoped inventory with low-stock alerts, usage/restock adjustments and movement history; categorized/date-filtered operating expenses.
- Branch creation, editing, capacity/opening-hour validation and switching. Historical branches remain in place so records continue to resolve.
- Reports now include repeat customers, membership totals, employee productivity and separately stated expenses alongside revenue and service performance.
- Added clickable local showcases for promotions, customer feedback, role permissions, payment methods, notification previews and website announcement management. The public homepage reflects a saved visible announcement. All external actions are clearly labeled as demonstrations and remain local.
- Version 4 migration adds seeded business/showcase data to v1–v3 without changing their operational history. Demo reset restores all new modules.

### Verification

- `npm test`: 25/25 passed, including v1/v3 migration, v4 validation and business domain safeguards.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run test:business`: passed CRUD/toggle/preview flows for the modules above and mobile overflow checks.
- `npm run test:e2e`, `npm run test:showcase`, and `npm run test:operations`: existing operational flows passed after the schema update.
- `npm run test:booking`: public reservation and admin booking flow remains covered after migration updates.
- `npm run build`: passed after the final Phase 4 edits.

### Intentional limits

- Membership points accrue once per payment at one point per Rp10,000; manual grants/redemptions remain simulated. Commission percentages apply to completed assigned orders using current rules, so they are estimates rather than historical payroll records.
- Inventory adjustments and expenses are manually entered. No accounting, procurement, real role enforcement, notification delivery or payment gateway integration exists.
- One-device localStorage limitations and non-production demo login remain unchanged.
