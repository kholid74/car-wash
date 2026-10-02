You are a senior product designer, UX engineer, and frontend engineer.

Build a polished, production-quality CLICKABLE FRONTEND PROTOTYPE for a custom Car Wash POS & Operations Management System.

This prototype will be demonstrated to a real prospective client who operates a car wash business.

IMPORTANT CONTEXT
=================

This is NOT yet the final production application.

The purpose of this prototype is to:

1. Validate the client's operational workflow.
2. Demonstrate how a custom car wash system could work.
3. Allow the client to interact with a realistic end-to-end workflow.
4. Discover missing requirements before preparing the final scope and quotation.
5. Show the difference between a generic POS and a system designed around the actual vehicle journey.

Do NOT over-engineer the backend.

For this prototype:
- Frontend should be fully clickable.
- Use realistic dummy data.
- State should persist during the browser session/localStorage if useful.
- No real database is required.
- No authentication backend is required.
- No payment gateway integration.
- No WhatsApp integration.
- No external API required.
- No real file upload storage required.
- Photo upload can use local preview/mock behavior.
- Every important action must visibly change the UI/state.

The prototype must feel like a REAL operational application, not a static Figma mockup.

==================================================
1. PRODUCT CONCEPT
==================================================

The system manages the complete car wash journey:

Vehicle arrives
→ Vehicle/customer identification
→ Initial vehicle inspection
→ Dirt/condition assessment
→ Service recommendation/selection
→ Pricing
→ Customer confirmation
→ Queue
→ Washing process
→ Quality check
→ Ready
→ Payment
→ Vehicle service history

A separate CUSTOMER-FACING QUEUE DISPLAY should also exist for a TV/monitor in the waiting area.

Core idea:

"From vehicle arrival and inspection to washing, payment, and vehicle history — all managed in one system."

The inspection process is one of the key differentiators.

Do not design this as a generic retail POS.

Think VEHICLE-FIRST and OPERATION-FIRST.

==================================================
2. TECH STACK
==================================================

Use a modern frontend stack suitable for a polished prototype.

Preferred:
- Next.js latest stable
- TypeScript
- Tailwind CSS
- shadcn/ui where useful
- Lucide icons
- Recharts for charts if needed

Use clean component architecture.

Do not introduce unnecessary dependencies.

The application must run with:

npm install
npm run dev

Before finishing:
- run lint
- run typecheck
- run build
- fix all relevant errors

==================================================
3. VISUAL DIRECTION
==================================================

Design language:

- Professional SaaS dashboard
- Clean
- Modern
- Operational
- Premium but practical
- Light theme
- White / very light gray surfaces
- Dark navy text
- Blue primary accent
- Subtle green for success
- Orange/amber for warnings
- Red only for destructive/error states
- Soft borders
- Restrained shadows
- Medium border radius
- Excellent spacing
- High information clarity

Avoid:
- excessive gradients
- excessive glassmorphism
- giant cards
- excessive rounded pills
- unnecessary animations
- decorative dashboard elements
- generic AI-generated SaaS appearance
- overly colorful UI

The UI should feel appropriate for staff who use it every day.

Desktop-first for operational/admin pages, but still responsive.

Queue Display must be optimized for:
- large TV
- desktop monitor
- tablet
- readability from several meters away

Use Indonesian language throughout the application.

Brand the demo subtly as:

"Kalsara Car Wash Demo"

Add a small footer/label:

"Concept Prototype by Kalsara Digital Studio"

Do not over-brand the client's operational UI.

==================================================
4. APPLICATION NAVIGATION
==================================================

Create a left sidebar for the admin application.

Navigation:

- Dashboard
- Check-in
- Antrian
- Transaksi
- Kendaraan
- Pelanggan
- Layanan & Harga
- Laporan
- Queue Display
- Pengaturan

Not every module needs complete functionality.

HIGH-PRIORITY FULLY CLICKABLE FLOW:

Dashboard
→ Check-in
→ Inspection
→ Service Recommendation
→ Price Confirmation
→ Queue
→ Washing
→ Quality Check
→ Ready
→ Payment
→ Vehicle History

The demo must support this end-to-end journey.

==================================================
5. GLOBAL DEMO DATA
==================================================

Create realistic Indonesian dummy data.

Main demo vehicle:

Plate:
B 1234 ABC

Vehicle:
Toyota Fortuner

Color:
White / Putih

Customer:
Andi Pratama

Phone:
0812-3456-7890

Previous visits:
5

Example previous services:
- Premium Wash
- Basic Wash
- Interior Cleaning

Create at least 8-12 additional vehicles/customers for dashboard, queue, reports, and transaction history.

Examples:

B 5678 XYZ
Toyota Avanza
Siti Rahma

B 9988 KLM
Honda Brio
Rizky Maulana

B 7712 DEF
Toyota Innova Zenix
Dimas Prakoso

B 8821 QWE
Mitsubishi Pajero Sport
Rina Wijaya

Use realistic but obviously fictional data.

==================================================
6. DASHBOARD
==================================================

Dashboard should immediately communicate TODAY'S OPERATIONS.

Header:
"Selamat datang"
"Pantau operasional car wash hari ini."

Primary CTA:
"+ Check-in Kendaraan"

Summary metrics:

- Kendaraan Hari Ini
- Menunggu
- Sedang Dicuci
- Selesai
- Pendapatan Hari Ini

Example values:
28 vehicles
4 waiting
3 washing
18 completed
Rp 3.450.000 revenue

Include an operational queue section.

Example:

A-012
B 1234 ABC
Toyota Fortuner
Menunggu
Premium Wash + Interior

A-013
B 5678 XYZ
Toyota Avanza
Sedang Dicuci
Basic Wash

A-014
B 9988 KLM
Honda Brio
Quality Check
Premium Wash

Include today's recent transactions.

Optionally include a small chart:
"Transaksi 7 Hari Terakhir"

Do not let analytics dominate the dashboard.

Operations are more important than analytics.

==================================================
7. VEHICLE CHECK-IN
==================================================

This starts the primary demo workflow.

Route suggestion:

/check-in

Page title:
"Check-in Kendaraan"

Large input:

"Masukkan nomor polisi"

Example:
B 1234 ABC

Button:
"Cari Kendaraan"

When searching B 1234 ABC:

Show existing vehicle:

Toyota Fortuner
B 1234 ABC
Putih

Customer:
Andi Pratama
0812-3456-7890

Previous visits:
5 kunjungan

Last visit:
Premium Wash
18 September 2026

CTA:

"Lanjut ke Inspeksi"

Also support:

"+ Kendaraan Baru"

New vehicle form:

- Nomor Polisi
- Jenis Kendaraan
- Merek
- Model
- Warna
- Nama Pelanggan
- Nomor WhatsApp

Vehicle types:
- City Car
- Sedan
- MPV
- SUV
- Pickup
- Van

Do not require every field.

==================================================
8. VEHICLE INSPECTION
==================================================

This is one of the MOST IMPORTANT pages.

Route:

/inspection/[vehicle]

Header:

"Inspeksi Kondisi Kendaraan"

Show vehicle identity prominently:

B 1234 ABC
Toyota Fortuner
Andi Pratama

Inspection categories:

EXTERIOR
INTERIOR
OTHER / ADDITIONAL CONDITION

Dirt Level:

- Ringan
- Sedang
- Berat

Make this visually easy to select.

Areas requiring attention:

Exterior:
- Body
- Kaca
- Velg
- Ban
- Kolong
- Jamur kaca
- Water spot

Interior:
- Dashboard
- Jok
- Karpet
- Plafon
- Bagasi
- Bau interior

Use checkboxes/cards.

Allow:
- inspection notes
- photo attachments with local preview/mock images

Example note:

"Noda cukup berat pada jok belakang dan terdapat water spot pada kaca depan."

Show inspection summary.

CTA:

"Lihat Rekomendasi Layanan"

IMPORTANT:

Do not imply that the recommendation algorithm is final.

This is a prototype.

==================================================
9. SERVICE RECOMMENDATION
==================================================

Route:

/service-selection/[workOrder]

Page:

"Rekomendasi Layanan"

Based on the example inspection:

Dirt:
Sedang

Selected areas:
Body
Interior
Jok
Kaca

Recommended:

Premium Wash
Rp120.000

Includes:
- Exterior wash
- Interior vacuum
- Tire cleaning
- Drying

Additional recommendation:

Interior Cleaning
Rp65.000

Other services:

Basic Wash
Rp60.000

Detailing
Rp250.000

Allow staff to:
- select/deselect services
- add another service
- manually change quantity if applicable

Display:

Subtotal
Discount (optional)
Total

Demo expected total:

Rp185.000

CTA:

"Lanjut Konfirmasi"

==================================================
10. PRICE & CUSTOMER CONFIRMATION
==================================================

Page:

"Konfirmasi Layanan & Harga"

Show:

Vehicle
Customer
Inspection summary
Selected services

Example:

Premium Wash      Rp120.000
Interior Cleaning Rp65.000

TOTAL:
Rp185.000

IMPORTANT:

Provide pricing mode:

Harga berdasarkan layanan

and allow:

"Ubah Harga Manual"

Do NOT assume final pricing logic.

Display a small informational message:

"Penentuan harga dapat disesuaikan dengan aturan operasional car wash."

Optional notes.

Buttons:

"Kembali"
"Konfirmasi & Masuk Antrean"

When confirmed:

Generate queue number:

A-012

Status:

MENUNGGU

Show success screen:

"Check-in berhasil"

A-012
B 1234 ABC
Toyota Fortuner

CTA:
"Lihat Antrian"

==================================================
11. OPERATIONAL QUEUE
==================================================

This is another HIGH-PRIORITY page.

Route:

/queue

Create Kanban-like operational columns:

MENUNGGU
SEDANG DICUCI
QUALITY CHECK
SIAP DIAMBIL

Each vehicle card contains:

Queue number
Plate
Vehicle
Customer
Service
Check-in time
Elapsed time
Assigned bay if available

Example:

A-012
B 1234 ABC
Toyota Fortuner

Premium Wash
Interior Cleaning

10:15
Menunggu 8 menit

Actions should allow changing status.

Do NOT require drag and drop.

Provide explicit buttons/menu:

"Mulai Cuci"
"Kirim ke QC"
"Tandai Siap"
"Batalkan"

When "Mulai Cuci" is clicked:

status becomes:
WASHING

Optionally assign:

Bay 1
Bay 2
Bay 3

When "Kirim ke QC":

QUALITY_CHECK

When "Tandai Siap":

READY

Every state change must update:

- queue page
- dashboard
- customer Queue Display

Use shared client-side state.

==================================================
12. WORK ORDER DETAIL
==================================================

Clicking a queue item opens:

/work-orders/[id]

Display:

Queue number
Plate
Vehicle
Customer

Timeline:

10:15 Check-in
10:20 Masuk antrean
10:35 Mulai dicuci
10:55 Quality check
11:02 Selesai

Show:

Inspection
Services
Photos
Notes
Price
Assigned bay
Current status

Provide status actions.

==================================================
13. CUSTOMER QUEUE DISPLAY
==================================================

VERY IMPORTANT FEATURE.

Create a separate route:

/display/queue

This should NOT show the normal admin sidebar.

This page represents a TV/display placed in the customer waiting area.

Design it specifically for long-distance readability.

Header:

"Status Kendaraan"

Optional subtitle:
"Pantau proses kendaraan Anda"

Show current time.

Large status cards/rows.

Example:

A-012
B 1234 ABC
Toyota Fortuner
SEDANG DICUCI
Bay 2

A-013
B 5678 XYZ
Toyota Avanza
MENUNGGU

A-014
B 9988 KLM
Honda Brio
QUALITY CHECK
Bay 1

A-009
B 7712 DEF
Toyota Innova
SIAP DIAMBIL

Statuses:

MENUNGGU
SEDANG DICUCI
QUALITY CHECK
SIAP DIAMBIL

Use visually distinct but tasteful status indicators.

READY / SIAP DIAMBIL should be especially noticeable.

Optionally divide screen:

Sedang Diproses
Siap Diambil

Privacy:

Create a simple setting/demo toggle:

Display identity:
- Nomor antrean saja
- Nomor antrean + kendaraan
- Nomor antrean + plat disamarkan
- Plat penuh

Masked example:

B 12•• ABC

Do not display customer phone numbers.

The Queue Display should reflect status changes made from the admin Queue page.

Simulate realtime updates through shared frontend state.

==================================================
14. PAYMENT / CASHIER
==================================================

When a vehicle becomes READY:

Allow:

"Proses Pembayaran"

Route:

/cashier/[workOrder]

Page:

"Pembayaran"

Show:

A-012
B 1234 ABC
Toyota Fortuner
Andi Pratama

Services:

Premium Wash      Rp120.000
Interior Cleaning Rp65.000

Subtotal:
Rp185.000

Discount:
Rp0

TOTAL:
Rp185.000

Payment methods:

- Tunai
- QRIS
- Transfer Bank
- E-Wallet

These are DEMO payment options only.

Do not integrate actual payment.

Button:

"Proses Pembayaran"

After clicking:

Show success:

"Pembayaran Berhasil"

Rp185.000

Transaction:
TRX-20261002-0012

Buttons:

"Lihat Receipt"
"Selesai"

Create a simple printable receipt modal/page.

After payment:

Status:
COMPLETED

==================================================
15. VEHICLE DATABASE
==================================================

Route:

/vehicles

Search:

"Nomor polisi / kendaraan / pelanggan"

Table/list:

Plate
Vehicle
Customer
Visits
Last Visit
Total Spend

Click B 1234 ABC.

Vehicle detail page:

Toyota Fortuner
B 1234 ABC
Putih

Owner:
Andi Pratama

Total visits:
6

Total spend:
Rp1.025.000

Tabs:

Overview
Service History
Inspection History

Service history:

02 Oct 2026
Premium Wash + Interior Cleaning
Rp185.000

18 Sep 2026
Premium Wash
Rp120.000

03 Sep 2026
Basic Wash
Rp60.000

Click transaction to show:

- inspection
- photos
- services
- notes
- price
- payment method

This page should demonstrate the value of maintaining VEHICLE HISTORY.

==================================================
16. CUSTOMER DATABASE
==================================================

Route:

/customers

Simple searchable list:

Customer
Phone
Vehicles
Visits
Total Spend

Customer detail:

Andi Pratama
0812-3456-7890

Vehicles:
Toyota Fortuner
B 1234 ABC

Show customer transaction history.

Keep this module relatively simple.

==================================================
17. SERVICES & PRICING
==================================================

Route:

/services

Show service catalog.

Examples:

Basic Wash
Rp60.000

Premium Wash
Rp120.000

Interior Cleaning
Rp65.000

Detailing
Rp250.000

Allow prototype interactions:

- Add service
- Edit price
- Enable/disable
- Edit description

Create a note:

"Harga pada prototype hanya contoh dan dapat disesuaikan dengan aturan bisnis."

Do not implement complex pricing rules yet.

==================================================
18. TRANSACTIONS
==================================================

Route:

/transactions

Table:

Transaction
Date
Vehicle
Customer
Services
Payment
Amount
Status

Filters:

Date
Payment method
Status

Click opens transaction detail.

==================================================
19. REPORTS
==================================================

Route:

/reports

Keep reports useful but lightweight.

Metrics:

Pendapatan Hari Ini
Pendapatan Bulan Ini
Jumlah Kendaraan
Rata-rata Transaksi

Charts:

Revenue 7 days
Vehicles 7 days
Popular services

Example:

Premium Wash 42%
Basic Wash 31%
Interior Cleaning 18%
Detailing 9%

Do not overbuild analytics.

==================================================
20. SETTINGS
==================================================

Route:

/settings

Prototype settings:

Business Information

Name:
Kalsara Car Wash Demo

Address:
Jl. Contoh No. 123, Tangerang Selatan

Phone:
0812-0000-0000

Operational settings:

Queue prefix:
A

Available bays:
3

Customer Queue Display:

Identity display:
- Queue only
- Queue + vehicle
- Queue + masked plate
- Full plate

Default:

Queue + masked plate

These settings should affect Queue Display where practical.

==================================================
21. DEMO MODE
==================================================

Make it obvious that this is a concept prototype.

Add a subtle badge in admin:

"Demo"

Tooltip or small text:

"Prototype untuk validasi alur operasional."

Do not make it intrusive.

Create a:

"Reset Demo"

button under settings or user menu.

Reset Demo restores all dummy data and returns B 1234 ABC to its initial state.

This is IMPORTANT because the demo will be shown repeatedly.

==================================================
22. DEMO STORY / GOLDEN PATH
==================================================

The entire application MUST support this exact presentation scenario:

STEP 1

Open Dashboard.

Show today's operations.

STEP 2

Click:
"+ Check-in Kendaraan"

STEP 3

Search:
B 1234 ABC

System finds:

Toyota Fortuner
Andi Pratama
5 previous visits

STEP 4

Continue to Inspection.

Select:

Dirt Level:
Sedang

Areas:
Body
Kaca
Interior
Jok

Add note:

"Noda cukup berat pada jok belakang."

STEP 5

Continue.

System recommends:

Premium Wash
Rp120.000

Interior Cleaning
Rp65.000

Total:
Rp185.000

STEP 6

Confirm.

Queue number generated:

A-012

Status:
MENUNGGU

STEP 7

Open Queue Display.

A-012 should appear.

STEP 8

Return to admin queue.

Change:

A-012
MENUNGGU
→ SEDANG DICUCI

Assign:
Bay 2

STEP 9

Open Queue Display.

It should now display:

A-012
Toyota Fortuner
SEDANG DICUCI
Bay 2

STEP 10

Admin changes:

SEDANG DICUCI
→ QUALITY CHECK

STEP 11

Admin changes:

QUALITY CHECK
→ SIAP DIAMBIL

Queue Display should clearly highlight:

A-012
SIAP DIAMBIL

STEP 12

Open cashier.

Payment:

QRIS

Rp185.000

STEP 13

Complete payment.

STEP 14

Open vehicle database.

Search:

B 1234 ABC

STEP 15

Service history should now contain today's transaction.

This GOLDEN PATH must work without page errors, dead buttons, or missing state.

==================================================
23. STATE MODEL
==================================================

Create clean frontend domain models.

Suggested concepts:

Customer
Vehicle
Inspection
Service
WorkOrder
QueueItem
Transaction
Bay

Suggested WorkOrderStatus:

CHECKED_IN
QUEUED
WASHING
QUALITY_CHECK
READY
COMPLETED
CANCELLED

Keep UI labels Indonesian.

Internally TypeScript enums/types can use English.

Use a centralized client-side state solution.

Choose the simplest appropriate approach:
- React Context + reducer
OR
- Zustand

Persistence:
localStorage

Provide seeded demo data.

Reset functionality should restore seed.

==================================================
24. UX DETAILS
==================================================

Pay attention to micro-interactions.

Every action should provide feedback.

Examples:

Toast:
"Kendaraan berhasil masuk antrean."

Toast:
"Status diperbarui menjadi Sedang Dicuci."

Toast:
"Pembayaran berhasil."

Confirm destructive actions.

Use loading states where useful, but do not add artificial long delays.

Empty states should be intentionally designed.

Examples:

"Belum ada kendaraan dalam Quality Check."

Search not found:

"Kendaraan belum terdaftar."

CTA:
"Daftarkan Kendaraan Baru"

Use Indonesian date and currency formatting.

Currency:

Rp185.000
not
Rp 185,000.00

Dates:

2 Oktober 2026

Times:

10:35

==================================================
25. RESPONSIVENESS
==================================================

Admin:

Desktop:
full sidebar

Tablet:
collapsible sidebar

Mobile:
drawer navigation

Tables should transform appropriately or allow controlled horizontal scroll.

Inspection page must be comfortable on tablet because staff may perform inspection using a tablet.

Queue operations should also work well on tablet.

Customer Queue Display should work especially well on:
1920x1080 TV.

==================================================
26. ACCESSIBILITY
==================================================

Use semantic controls.

Do not communicate status using color alone.

Each status needs:
- color
- icon where appropriate
- text label

Ensure good contrast.

Buttons should have clear labels.

Forms must have labels.

==================================================
27. CODE QUALITY
==================================================

Use reusable components.

Examples:

VehicleCard
QueueCard
StatusBadge
ServiceCard
InspectionChecklist
WorkOrderTimeline
CurrencyDisplay
MetricCard
EmptyState
ConfirmDialog

Avoid giant page components.

Keep domain logic separated from presentation where reasonable.

Use proper TypeScript types.

Avoid `any`.

Avoid duplicated mock data across components.

Use centralized seed data.

==================================================
28. DO NOT BUILD YET
==================================================

Do NOT implement:

- Real authentication
- Real database
- Real backend API
- Payment gateway
- WhatsApp API
- Inventory management
- Payroll
- Employee attendance
- Accounting
- Membership
- Loyalty points
- Multi-outlet
- Booking website
- Customer mobile app
- Automatic license plate recognition
- IoT
- CCTV
- Real printer integration
- Real receipt hardware
- Complex discount engine
- AI image analysis
- Automatic dirt detection

These may become future modules after client discovery.

Do not add features simply to make the application look larger.

==================================================
29. FUTURE MODULES
==================================================

Optionally show a small "Pengembangan Selanjutnya" section in Settings or Dashboard.

Examples:

- Membership & Loyalty
- Inventory
- WhatsApp Notifications
- Online Booking
- Multi Outlet
- Employee Management
- Accounting Integration
- Customer Portal

Clearly label them:

"Pengembangan Selanjutnya"

Do not make them clickable unless implemented.

==================================================
30. PRODUCT PRINCIPLES
==================================================

Throughout implementation, follow these principles:

1. Operational clarity > visual decoration.
2. Vehicle journey > generic POS workflow.
3. Inspection is a core feature.
4. Queue visibility is a core feature.
5. Vehicle history creates long-term value.
6. Customer-facing queue display should feel useful in a real physical car wash.
7. Every important demo interaction must work.
8. Do not pretend prototype assumptions are confirmed business rules.
9. Keep room for client feedback.
10. The application should feel like something that could realistically evolve into a production system.

==================================================
31. ACCEPTANCE CRITERIA
==================================================

Before declaring completion, verify manually:

[ ] Application starts successfully.
[ ] Dashboard renders realistic operational data.
[ ] B 1234 ABC can be searched.
[ ] Existing customer/vehicle appears.
[ ] Inspection selections work.
[ ] Inspection notes work.
[ ] Service selection works.
[ ] Rp185.000 scenario works.
[ ] Work order A-012 can be generated.
[ ] Vehicle appears in queue.
[ ] Queue status can change.
[ ] Bay can be assigned.
[ ] Queue Display reflects queue state.
[ ] Queue Display does not expose phone numbers.
[ ] READY vehicle is clearly visible.
[ ] Payment flow works.
[ ] QRIS can be selected as demo payment.
[ ] Transaction can be completed.
[ ] Vehicle history updates after transaction.
[ ] Refresh does not immediately destroy demo state.
[ ] Reset Demo restores seed data.
[ ] Navigation has no dead primary links.
[ ] No major console errors.
[ ] Mobile layout is usable.
[ ] Tablet inspection layout is usable.
[ ] TV queue display is readable.
[ ] Currency formatting is Indonesian.
[ ] All visible UI is primarily Indonesian.
[ ] npm run build succeeds.

==================================================
32. FINAL DELIVERABLE
==================================================

Implement the prototype completely.

Do not stop after creating wireframes or describing what should be built.

Create all required files and routes.

Use sensible dummy images/placeholders where required.

After implementation:

1. Run the application checks.
2. Fix TypeScript errors.
3. Fix lint issues that affect quality.
4. Ensure build succeeds.
5. Review the golden path manually from the code/state logic.
6. Improve obvious visual inconsistencies.
7. Remove dead controls.
8. Make sure the demo can be reset.

Then provide a concise summary containing:

- What was implemented
- Main routes
- How to run
- Demo scenario
- Important prototype assumptions
- What should be validated with the client before production

Do not ask me to approve every implementation decision.

Make sensible product decisions yourself while respecting the requirements above.

Start by inspecting the repository. If it is empty, initialize the application and proceed.
