# Showcase revamp audit

Date: 12 October 2026. Baseline: source inspection before Phase 1. Scope follows `brief_1.md` and the user's six clarifications.

## Architecture

- Next.js 16 / React 19 / strict TypeScript, Tailwind 4 installed; most styling is custom CSS in `src/app/globals.css`.
- `src/app/[[...path]]/page.tsx` mounts one client application. `application.tsx` switches on URL segments and owns the sidebar. `/` and `/dashboard` both render Dashboard.
- `src/lib/domain.ts` contains models, pricing, recommendations, valid transitions, bay occupancy checks and payment rules.
- `src/lib/store.tsx` uses Context and `useSyncExternalStore`, with localStorage key `kalsara-car-wash-v1`. Storage events synchronize tabs on the same origin, not devices. Updates save before emitting; storage failures are shown to the user.
- `seed.ts` provides 12 customer/vehicle pairs, four services, today's 11 orders, 36 recent history orders and five visits for B 1234 ABC. Next queue number is A-012; Bay 2 is available.
- No backend, authentication, asset library or chart package. No `public` directory at baseline.

## Implemented modules

| Module / source | Verified behavior |
| --- | --- |
| Dashboard / `dashboard.tsx` | Store-derived metrics, active queue preview, bay occupancy, paid transactions. |
| Check-in / `check-in.tsx` | Plate normalization/search, registration with validation, duplicate plate rejection, reuses an existing active order. New registration creates a new customer; choosing an existing customer for a new vehicle is not implemented. |
| Inspection / `check-in.tsx` | Exterior/interior conditions, dirt level, notes, up to four compressed local photo previews, demo recommendation rules. |
| Pricing / `check-in.tsx` | Service selection, quantities, discount, manual total and explicit customer consent. |
| Operations / `operations.tsx` | Queue search; QUEUED → WASHING → QUALITY_CHECK → READY; available bay selection; cancellation; work-order details and timeline. |
| Cashier / `operations.tsx` | Payment only at READY, four simulated payment methods, cash/change, completes order and records transaction, receipt dialog and print styles. No standalone cashier selection page. |
| Queue Display / `operations.tsx` | Separate `/display/queue`, clock, ready highlighting, configurable masking, fullscreen control; no customer phone display. |
| Customers / vehicles / `records.tsx` | Search, detail views, spending, visits, transaction history and inspection photos. |
| Catalog / `records.tsx` | Add/edit service, price, duration, description and active flag. Historical line items retain their price. |
| Transactions / `records.tsx` | Date, method, status and text filters, work-order details. |
| Reports / `dashboard.tsx` | Store-derived seven-day revenue/vehicle bar charts and service popularity. |
| Settings / `records.tsx` | Business information, bay count, queue prefix, display privacy, guarded reset. Future modules are text only. |

## Navigation and reusable UI

Existing links: `/`, `/check-in`, `/queue`, `/transactions`, `/vehicles`, `/customers`, `/services`, `/reports`, `/settings`, `/display/queue`. Detail routes include `/inspection/:vehicle`, `/service-selection/:order`, `/confirmation/:order`, `/work-orders/:id`, `/cashier/:id`, vehicle/customer/transaction details.

Reuse PageHeading, Panel, MetricCard, StatusBadge, VehicleIdentity, SearchBox, EmptyState, native-dialog Modal, ConfirmDialog, ErrorMessage, Stepper, PriceSummary, TransactionTable and OrderActions. Keep domain transitions centralized.

## Visual and UX observations from source

- Existing theme already has reusable tokens, responsive sidebar, cards, tables, native dialogs and reduced-motion support. Improve it incrementally.
- Sidebar has one main group and some secondary links; no public/admin separation or session flow.
- Dashboard repeats today's metrics but has no revenue trend, average service duration, operational alert or upcoming reservation panel. Its active orders are limited to today's check-ins, so overnight unfinished work disappears from its preview/bay occupancy.
- Cashier and work-order detail exist, but their list entry points are absent. QC is accessible only through queue cards.
- Sidebar outlet chevron implies a selector but has no action.
- No automotive photography or public-facing layout. Visual browser validation is required after Phase 1; these observations are not a claim of a completed visual audit.

## Gaps and dependencies

No booking/reservation, membership/points, employee/attendance/commission, stock/expense or multi-branch models are present in DemoState. No implementation exists for promotions, feedback, roles, notifications or website settings. The user permits local clickable showcase versions of secondary modules. Build navigation progressively, never dead links.

Branch and bay foundation precedes reservation capacity; reservation → check-in must not create duplicate orders. Membership/commissions/inventory/reporting depend on payment and service data. Public pricing must share the catalog.

## Risks and regression requirements

- Root URL currently means dashboard. Every internal link, router push and E2E entry must follow the `/admin` move; legacy links should redirect and still show the demo login gate.
- Store accepts only schema version 1 with shallow validation. Future migration must retain customers, orders, prices, history, photos, settings and queue counter, assigning existing operations to the original branch. Phase 1 does not require a schema change.
- localStorage is neither an authentication boundary nor a production booking lock. Demo login cannot protect real data. Keep all records fictional.
- Whole-store writes from simultaneous tabs can overwrite one another; showcase booking targets one operator, not production concurrency.
- Timeline labels in seed and transitions use different text for some events; duration calculations must account for both. Seed timing may compress completed visits near midnight.
- Existing payment transaction ID embeds `20261002`; record this for the core-operations phase along with date-dependent tests.
- Photos consume browser quota; preserve current compression and write-error handling.
- Preserve golden path A-012 / Rp185.000, manual price, masking, bay collision checks, history, receipt and reset.

## Baseline validation

- `npm test`: executed; 13/13 passed before changes.
- Existing `tests/demo.mjs`: 16-step Playwright golden path; application must already be running. Reads root as dashboard and must be adapted for login/admin routing.
- Lint, typecheck, build and browser checks will be recorded in the implementation plan after Phase 1.

## Phase 1 follow-up

The plan now records successful lint/typecheck/build, 14 domain tests, the 17-check golden path and the new showcase browser suite. Dashboard screenshots were reviewed at desktop/tablet/mobile widths, plus public/login desktop views. Mobile validation exposed an absolutely positioned table header label escaping its scroll container; positioning the container fixed the page overflow. Reduced-motion transitions now stop fully so drawer focus follows its visible state. Remaining module gaps and risks above describe the baseline and are scheduled in later phases.

## Phase 2 follow-up

Core operations and the branch/bay foundation are implemented. Schema v2 migration preserves v1 records, including manual prices and photos, while failed reads/writes preserve the original data. Orders, payments, dashboards and bay availability are scoped by the selected branch; customers and vehicles stay shared. Staff assignment and detailing display use the existing workflow. Payment IDs now follow the Jakarta payment date; unpaid transaction totals respect manual prices.

The plan records 21 passing domain tests, browser migration/operations checks, the unchanged golden path and responsive visual checks. Booking, richer business modules and production concurrency remain outside Phase 2. Branch selection currently applies to every demo tab, including the public queue display.

## Phase 3 follow-up

The root is now the full public automotive site; booking and reservation management use the existing local store. v2 data migrates explicitly to v3 without resetting saved operations. Booking capacity uses available branch bays and fixed hourly slots, with pending/confirmed reservations occupying capacity and cancellations releasing it. The admin flow converts a reservation once into the existing inspection workflow. Local image sources and license are in `docs/PUBLIC_IMAGE_CREDITS.md`; test results and showcase limits are in the plan's Phase 3 verification.

## Phase 4 follow-up

The v4 store adds memberships, attendance, commission rules, inventory and movement history, operating expenses, and secondary showcase settings. Business pages use the existing branch selector and keep branch-scoped data together. Reports include customer retention, membership, employee productivity and expense summaries. Promotion, feedback, role, payment, notification and website screens provide local interactions with explicit demo limits. See the plan's Phase 4 verification for test results and assumptions.
