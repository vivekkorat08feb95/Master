# Agent Blueprint & Technical Specification
# StockStoreKhata: Multi-Tenant Database-per-Tenant Retail ERP, POS Billing, Stock Register & AI Retail OS

> **Target Audience:** AI Agents, Architects, and Developers deploying, maintaining, or extending this software.  
> **Application Brand:** **StockStoreKhata** (`StockStore` + `Khata`)  
> **Repository Root:** `c:\vivekwork\khatabook\`  
> **Architecture Pattern:** Clean N-Tier (Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ linq2db $\rightarrow$ PostgreSQL).  
> **Multi-Tenancy Model:** **Database-per-Tenant** (100% physical database isolation per retailer).

---

## 1. System Overview & Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend (FE)** | React (Vite + TypeScript) | 19.x | Ultra-responsive desktop & web interface |
| **Styling & UI** | Tailwind CSS + Lucide Icons | v4 | Clean POS counter, dark navbar, and billing design |
| **Backend (BE)** | ASP.NET Core Web API | .NET 10 LTS | High-performance, strongly-typed REST API |
| **Architecture** | Layered Clean N-Tier | - | Decoupled, testable enterprise structure |
| **Data Access** | `linq2db` | 6.5.0 | High-speed micro-ORM with compile-time type safety |
| **Database** | PostgreSQL | 15+ (Local/Cloud) | Identical engine across local PC and cloud |
| **Migrations** | `DbUp-PostgreSQL` | 7.0.1 | Automated startup migrations for Master & Tenant DBs |
| **Payments** | Dynamic NPCI UPI QR | `qrcode` | Live dynamic UPI QR encoded with exact bill total |
| **AI POS Voice** | Web Speech API + Parser | Native | Multilingual Speech-to-Cart (Hindi, Gujarati, English) |
| **Logging & Audit**| Serilog + PostgreSQL | Serilog 9.0 | Full-context request telemetry, device detection & masking |
| **Exports Engine**| `xlsx` + `jspdf` + `autotable` | Latest | 1-Click dynamic Excel & presentation PDF generator |
| **Admin Security**| `X-Admin-Token` Guard | Custom | Super Admin security portal & multi-tenant console protection |
| **API Docs** | Swagger / OpenAPI | Swashbuckle 10 | Interactive API Explorer at `http://localhost:5260/swagger` |

---

## 2. Multi-Tenancy: Database-per-Tenant Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │       MASTER DATABASE: khatabook_master      │
                    │   - tenants (code, name, type, db_name, upi) │
                    │   - master_users (owner credentials, role)   │
                    │   - user_tenants (tenant-to-user mappings)   │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐
│ DEDICATED DATABASE:        │ │ DEDICATED DATABASE:        │ │ DEDICATED DATABASE:        │
│ khatabook_tenant_agro1     │ │ khatabook_tenant_agro2     │ │ khatabook_tenant_kirana1   │
├────────────────────────────┤ ├────────────────────────────┤ ├────────────────────────────┤
│ • Parties (Customer/Dealer)│ │ • Parties (Customer/Dealer)│ │ • Parties (Customer/Dealer)│
│ • Items (Wholesale/MRP/UOM)│ │ • Items (Wholesale/MRP/UOM)│ │ • Items (Wholesale/MRP/UOM)│
│ • Batch & Expiry Records   │ │ • Batch & Expiry Records   │ │ • Invoices & Price Tiers   │
│ • Invoices & Transactions  │ │ • Invoices & Transactions  │ │ • Transactions & Daybook   │
│ • Stock Movements Audit    │ │ • Stock Movements Audit    │ │ • Stock Movements Audit    │
└────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
```

### Key Architectural Tenets:
1. **100% Physical Data Isolation:** Each retailer ("customer") has their own independent PostgreSQL database (`khatabook_tenant_{code}`). Competitors or separate branches can never access each other's data.
2. **Customer-Wise Login (No Cross-Store Switcher):** Regular retailers log in and are locked strictly to their dedicated store session. No dropdown allows seeing or switching to other retailers.
3. **Super Admin Platform Panel:** Accessible via the login screen to inspect all registered retailer databases, physical database names, and platform statistics.

---

## 3. Generic Retailer Industry Profiles

The application dynamically adapts units, categories, and terminology based on the store's `business_type`:

| Profile | Specialized Units | Specialized Categories | Specialized Fields |
| :--- | :--- | :--- | :--- |
| 🌾 **Agro Store** | `Bag`, `Kg`, `Ltr`, `Packet`, `Bottle` | Seeds, Fertilizers, Pesticides, Bio-Nutrients | `batch_number`, `expiry_date`, Farmer Khata |
| 🛒 **Kirana & Grocery** | `Kg`, `Gm`, `Pcs`, `Packet`, `Ltr` | Grains, Spices, Oils, FMCG, Snacks | Barcode scan, weight measurement, Loose sales |
| 💊 **Medical / Pharmacy** | `Strip`, `Box`, `Tab`, `Bottle`, `Vial` | Tablets, Syrups, Injections, Surgical | `batch_number`, `expiry_date`, `dl_number`, Strip <-> Tab conversion |
| 🔧 **Vehicle Garage** | `Service`, `Set`, `Pcs`, `Ltr` | Spare Parts, Lubricants, Labor Charges | `vehicle_number`, `part_number`, Job card billing |
| 📱 **Electronics** | `Pcs`, `Box`, `Set` | Mobiles, Accessories, Appliances | `serial_imei`, Warranty tracking |
| 🏬 **General Retail** | `Pcs`, `Box`, `Set`, `Unit` | General | Standard barcode & invoicing |

---

## 4. Software Layered Architecture & Generic Repository Pattern

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER (React 19)                     │
│  AuthView, DashboardView, KhataView, InventoryView, BillingView,       │
│  ReportsView, AdminView, MigrationView, StoreSettingsModal             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (Port 5260)
┌───────────────────────────────────▼────────────────────────────────────┐
│                      API CONTROLLERS LAYER (.NET 10)                   │
│  AuthController, PartiesController, ItemsController, InvoicesController│
│  TransactionsController, ReportsController, MigrationController        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Injects Interfaces
┌───────────────────────────────────▼────────────────────────────────────┐
│                            SERVICE LAYER                               │
│  IAuthService, IPartyService, IInventoryService, IBillingService,      │
│  IReportService, IMigrationService                                     │
│  (Business rules, bulk import validation, opening balance transactions)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Injects Interfaces
┌───────────────────────────────────▼────────────────────────────────────┐
│                   GENERIC & DOMAIN REPOSITORY LAYER                    │
│  IGenericRepository<T> ──> GenericRepository<T : class, IEntity>       │
│  ├── IPartyRepository        (Inherits Generic + searches native names)│
│  ├── IItemRepository         (Inherits Generic + searches native names)│
│  ├── IInvoiceRepository      (Inherits Generic + user-wise history)    │
│  ├── ITransactionRepository  (Inherits Generic + daybook queries)      │
│  ├── IStockMovementRepository(Inherits Generic + batch tracking)       │
│  └── ITenantRepository       (Master DB CRUD & branding/UPI updates)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Uses LinqToDB DataConnections
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DATA ACCESS LAYER (linq2db)                         │
│  MasterDataConnection (khatabook_master)                               │
│  TenantDataConnection (khatabook_tenant_{code})                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Generic Repository Contract (`IGenericRepository<T>`)
Every domain entity implements `IEntity { Guid Id { get; set; } }`. The generic repository provides:
- `Task<T?> GetByIdAsync(Guid id)`
- `Task<List<T>> GetAllAsync()`
- `Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate)`
- `Task<T> AddAsync(T entity)`
- `Task<int> AddRangeAsync(IEnumerable<T> entities)`
- `Task<bool> UpdateAsync(T entity)`
- `Task<bool> DeleteAsync(Guid id)`
- `Task<bool> ExistsAsync(Guid id)`
- `Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null)`

Domain repositories inherit from `GenericRepository<T>`, allowing clean domain extensions without writing repetitive boilerplate queries.

---

## 5. Automated Multi-Database Migration Architecture (`DbUp`)

### Master Schema Migrations (`src/Khatabook.Api/Migrations/Master/Scripts/`)
- `001_master_schema.sql`: Base master tables (`tenants`, `master_users`, `user_tenants`).
- `002_add_code_to_tenants.sql`: Adds unique code column to tenants.
- `003_seed_master_data.sql`: Default agro and kirana demo tenants.
- `004_add_branding_to_tenants.sql`: Adds `logo_url`, `tagline`, `gstin`, `print_header_note`, and `print_footer_note`.
- `005_add_upi_to_tenants.sql`: Adds `upi_id` (VPA) and `upi_payee_name` for dynamic payments.

### Tenant Schema Migrations (`src/Khatabook.Api/Migrations/Tenant/Scripts/`)
- `001_tenant_schema.sql`: Base tables (`parties`, `items`, `stock_movements`, `invoices`, `invoice_items`, `transactions`).
- `002_add_created_by_name_to_invoices.sql`: Adds `created_by_name` and indexes for user-wise billing history.
- `003_add_native_names.sql`: Adds `native_name` column and indexes to `parties`, `items`, and `invoice_items` for regional script support.
- `004_add_wholesale_and_uom.sql`: Adds `wholesale_price`, `secondary_unit`, `unit_conversion_ratio` to `items`, and `price_tier` to `invoice_items`.

### Application Startup Hook (`DatabaseMigrator.cs`):
1. `MigrateMasterDatabase`: Ensures `khatabook_master` exists and applies all pending master scripts.
2. `MigrateAllTenantDatabasesAsync`: Queries `SELECT database_name FROM tenants WHERE is_active = TRUE`.
3. Loops over every tenant database (`khatabook_tenant_agro1`, `khatabook_tenant_kirana1`, etc.):
   - Ensures database exists.
   - Runs any unapplied scripts from `Tenant/Scripts/`.
4. **Result:** Whenever a new feature or migration is deployed, **EVERY retailer's database is automatically upgraded with zero manual database administration!**

---

## 6. Legacy Data Import, Regional Script & Store Branding Engine

### A. Legacy & Previous Software Migration (`IMigrationService`)
For retailers migrating from Vyapar, Tally, Marg, Excel sheets, or paper registers:
1. **Bulk Customer & Supplier Import (`POST /api/migration/import-parties`):**
   - Imports name, native name, phone, address, credit limit, and opening balance.
   - Automatically posts backdated `OPENING_BALANCE` ledger transactions so historical statements balance properly.
2. **Bulk Inventory Item Import (`POST /api/migration/import-items`):**
   - Imports SKU/barcode, English name, native name, unit, purchase price, selling price, wholesale price, secondary unit, conversion ratio, and opening stock.
   - Automatically writes `OPENING_STOCK` audit records in `stock_movements`.
3. **Bulk Historical Invoice Import (`POST /api/migration/import-invoices`):**
   - Imports past sales bills, line items with regional names, payment modes, and cashier attribution.
4. **Interactive Migration Wizard (`MigrationView.tsx`):**
   - 3-tab UI with pre-built JSON/Excel templates, sample data generators, and live validation.

### B. Regional / Native Script Support
- Supports Hindi (हिंदी), Gujarati (ગુજરાતી), Marathi (मराठी), Tamil, Telugu, and all Unicode scripts for `Item`, `Party`, and `InvoiceItem`.
- Search bars in Khata, Inventory, and Billing query across **both English and native names** concurrently.
- Printable receipts display bilingual item descriptions (e.g., `Wheat Flour / गेहूं का आटा`).

### C. Store Branding Everywhere
- Retailers configure custom branding in `StoreSettingsModal.tsx`:
  - **Shop Logo:** Encoded as Base64 data URLs for offline and cloud desktop reliability.
  - **Tagline:** Shown in navbar, store headers, and invoice bills.
  - **GSTIN & Contact:** Displayed on all customer bills.
  - **Dynamic UPI Settings:** UPI ID (`upiId`) and Payee Name (`upiPayeeName`).
  - **Print Header & Footer Notes:** Customizable receipt messages.

---

## 7. Multi-Price Lists, UOM Conversions & Dynamic UPI QR

### Dynamic NPCI UPI QR System (`utils/upiQr.ts`)
- Automatically compiles NPCI-compliant UPI URIs:  
  `upi://pay?pa={upiId}&pn={payeeName}&am={amount}&cu=INR&tn=Bill-{invoiceNumber}`
- Generates high-resolution vector QR code using `qrcode` library.
- **Counter Modal:** Cashier clicks "Show Dynamic UPI QR" on the POS screen to display a customer-facing scanner showing the exact bill amount.
- **Auto-Close & Instant Invoice Generation on Payment Success:**
  - Cashier confirms payment (or lets the 5-second live soundbox simulator auto-detect).
  - Web Speech API announces audible soundbox chime (*"Store: Received ₹{amount} payment via UPI"*).
  - Modal displays celebratory green confirmation banner and automatically closes after 900ms.
  - Software automatically executes checkout, creates the invoice in the backend, and presents the generated bill preview ready for instant Thermal 80mm / A4 printing or WhatsApp dispatch.
- **Printable Invoices:** Embedded directly in both Thermal 80mm receipts and A4 Tax Invoices.

### Multi-Price Lists (Retail vs Wholesale)
- Items support both `selling_price` (Retail/MRP) and `wholesale_price` (Bulk/B2B rate).
- Billing screen provides a **Price Tier Toggle** (`Retail Rate` vs `Wholesale Rate`).
- When toggled, all items in the cart automatically recalculate according to the selected tier.
- Invoices record `price_tier` per line item for historical audit accuracy.

### Multi-Units & UOM Conversions
- Primary unit (e.g. `Bag`, `Box`, `Kg`) and secondary unit (e.g. `Kg`, `Strip`, `Gm`) with conversion ratios:
  - 1 Bag = 50 Kg
  - 1 Box = 10 Strips
  - 1 Strip = 10 Tablets
- Invoices and stock tables display unit conversion ratios for transparent billing.

---

## 8. WhatsApp Business & Multilingual Udhaar Collections Engine

### Instant WhatsApp Invoice Sharing (`utils/whatsappHelper.ts`)
- Cashier can click "Send on WhatsApp" to generate a pre-formatted message:
  ```text
  Namaste Ramesh Bhai, thank you for shopping at Shreenathji Agro!
  Bill #INV-2026-0042
  Total Amount: ₹4,250.00
  Payment Status: PAID
  Pay via UPI: upi://pay?pa=store@okaxis&am=4250...
  ```
- Direct launch into WhatsApp Web / Desktop via `https://wa.me/{phone}?text={encoded}`.

### Multilingual Udhaar Reminders (`KhataView.tsx`)
- One-click buttons to send polite, culturally appropriate payment reminders in:
  - **English:** `Dear customer, polite reminder regarding your pending balance...`
  - **Hindi (हिंदी):** `नमस्ते रमेश जी, श्रीनाथजी एग्रो से आपकी ₹4,250 की बकाया राशि लंबित है...`
  - **Gujarati (ગુજરાતી):** `નમસ્તે રમેશ ભાઈ, શ્રીનાથજી એગ્રો માંથી તમારી ₹4,250 ની બાકી રકમ ચૂકવવા વિનંતી...`
- Includes one-click direct UPI payment link so the customer can tap and pay immediately.

---

## 9. Multi-Staff Role-Based Access Control (RBAC)

### User Roles:
- **Owner / Admin:** Full access to all modules, financial reports, store branding, and migration tools.
- **Manager:** Can manage inventory, billing, customers, and view reports.
- **Cashier / Staff:** Dedicated till operator. Restricted from:
  - Modifying store branding and UPI settings.
  - Viewing financial profit/loss and turnover reports.
  - Accessing the legacy data migration wizard.

### UI RBAC Implementation (`Navbar.tsx` & `App.tsx`):
- Dynamic role badge displayed next to the cashier's name (`OWNER`, `MANAGER`, `CASHIER`).
- Store Settings button hidden for cashiers.
- Navigation items filtered automatically based on the user's role.

---

## 10. Futuristic AI Retail Suite

### 1. Multilingual AI Voice POS (`utils/voiceParser.ts`)
- Built using Web Speech API with fallback support.
- Microphone button directly in the POS billing header.
- Listens in English, Hindi, and Gujarati.
- Smart quantity parser converts regional spoken number words into quantities:
  - Hindi: *"do packet urea"* $\rightarrow$ 2x Urea
  - Gujarati: *"tran kilo wheat"* $\rightarrow$ 3x Wheat
  - English: *"add five soap"* $\rightarrow$ 5x Soap

### 2. AI Smart Credit Risk Scoring & Udhaar Trust Index (`utils/creditScorer.ts`)
- Automatically assesses customer creditworthiness on the POS screen and Khata ledger:
  - **SAFE (🟢 Score > 70):** Excellent credit standing, fast settlement history.
  - **MODERATE (🟡 Score 40-70):** Borderline credit limit, recommend partial payment.
  - **HIGH RISK (🔴 Score < 40):** Overdue balance or credit limit exceeded. Immediate cash-only alert!
- Displays limit utilization percentage and actionable AI advice.

### 3. AI Predictive Expiry & Dead-Stock Loss Prevention (`InventoryView.tsx`)
- Continuously analyzes catalog batches for items expiring within 90 days.
- Renders smart alert banner in the stock view:
  > *"AI Expiry & Dead-Stock Risk Alert: 3 items expiring soon. Run a clearance bundle or discount wholesale to minimize inventory loss."*
- One-click filter button (`Filter Expiring Items`) to view and action vulnerable stock.

### 4. Smart Multi-Bill Udhaar Settlement & Partial Payment Auto-Reconciliation Engine (`KhataView.tsx`, `PartyService.cs`)
- **Real-World Business Scenario:**
  - A customer has multiple pending credit bills (e.g., Bill #1 for ₹2,000 and Bill #2 for ₹3,400, Total Due = ₹5,400).
  - The customer pays a lump-sum partial payment (e.g., ₹4,000) via Cash, UPI, Bank Transfer, or Cheque.
- **Automated FIFO Reconciliation Engine:**
  - Automatically queries all unpaid invoices for the party ordered chronologically (`InvoiceDate ASC`).
  - Sequentially applies funds to the oldest outstanding bill first:
    - **Bill #1 (₹2,000 due):** Receives ₹2,000 allocation $\rightarrow$ Paid Amount becomes ₹2,000, Status updated to `PAID` (₹0 due).
    - **Bill #2 (₹3,400 due):** Receives remaining ₹2,000 allocation $\rightarrow$ Paid Amount becomes ₹2,000, Status updated to `PARTIAL` (₹1,400 remaining due).
  - Updates customer's `CurrentBalance` in real time (₹5,400 $\rightarrow$ ₹1,400).
  - Automatically records a `CREDIT` transaction entry in the customer's ledger cashbook with audit details.
- **Manual Custom Split Override:**
  - Retailers can toggle "Customize Split" to allocate payments to specific bills manually if requested by the customer.
- **Live Interactive FIFO Preview:**
  - In `KhataView.tsx`, as the retailer types the received amount, a real-time FIFO breakdown card renders showing each bill's before-and-after status (`✅ Fully Paid`, `⚠️ Partial Due: ₹X`, or `⏳ Pending`).
- **Settlement Receipt & WhatsApp Integration:**
  - Generates thermal receipt with shop logo, GSTIN, payment mode, previous balance, amount paid, new balance due, and itemized reconciled bills.
  - **1-Click Print:** Direct print via thermal printer.
  - **1-Click WhatsApp Receipt:** Formats official receipt text with an instant UPI link for the customer to pay the remaining balance.

### 5. Frictionless Direct WhatsApp Dispatch & Automatic Bill Delivery (`whatsappHelper.ts`, `BillingView.tsx`, `KhataView.tsx`)
- **Zero-Tab Protocol Dispatch (`whatsapp://`):**
  - Standard web links (`<a target="_blank" href="https://wa.me/...">`) open blank browser tabs that redirect and disrupt POS flow.
  - Replaced with direct protocol invocation (`whatsapp://send?phone=...&text=...`), which directly launches the Windows WhatsApp Desktop application without creating or leaving ANY new browser tabs!
  - **Dual Mode Support:**
    - **⚡ Desktop App (No Tabs - Default):** Uses `whatsapp://send` to directly open WhatsApp Desktop on Windows.
    - **🌐 Web Popup (Single Reusable Window):** Opens a dedicated compact floating window (`khatabook_whatsapp_applet`) that is reused for all dispatches, preventing browser tab clutter.
- **Automatic WhatsApp Dispatch on Bill Generation:**
  - Added `Auto-send bill on WhatsApp` toggle directly on the POS billing screen (`BillingView.tsx`).
  - When enabled (default), upon completing checkout or verifying UPI, the bill with line items and dynamic UPI payment link is **instantly and automatically dispatched** to the customer's WhatsApp at the exact moment the invoice is generated—zero extra clicks needed!
- **Automatic WhatsApp Dispatch on Udhaar Settlement:**
  - Added `Auto-send receipt to WhatsApp` toggle in the Settle Udhaar modal (`KhataView.tsx`).
  - When confirmed, the customer immediately receives the official settlement receipt and remaining due balance with an instant UPI payment link.
- **Direct WhatsApp Payment Reminders:**
  - Customer profile action bar features direct-dispatch reminder buttons (Hindi, Gujarati, English) that send instant Khata balance reminders without opening new browser tabs.

### 6. Universal Barcode & QR Scanner Engine for POS Billing & Stock Control (`audioBeep.ts`, `BarcodeCameraScanner.tsx`, `BillingView.tsx`, `InventoryView.tsx`)
- **Native Web Audio Supermarket Scanner Beep (`utils/audioBeep.ts`):**
  - Synthesizes classic retail POS 1750 Hz laser beep for successful scans and 320 Hz error buzz for unrecognized codes.
  - 100% native Web Audio API—requires no external audio files and guarantees $< 5$ms latency.
- **Dual Hardware & Camera Scanner Architecture:**
  - **USB & Bluetooth Handheld Barcode Guns:** Built-in global keyboard wedge listener detects burst keystroke intervals ($< 55$ms per character) terminated with `Enter`, allowing instant scanning whether the search box is focused or not.
  - **Camera / Webcam Scanner (`components/BarcodeCameraScanner.tsx`):** Powered by `html5-qrcode` with an aiming reticle guide. Scans 1D retail barcodes (EAN-13, EAN-8, Code 128, Code 39, UPC-A) and 2D QR codes using phone/laptop cameras.
- **POS Billing: Auto-Add 1 Pack & Merge with Sum (`BillingView.tsx`):**
  - Scanning an item adds 1 pack/unit directly into the cart.
  - **Smart Merge:** If the item is already present in the cart, the system increments its quantity by 1 (`+1 sum`), recalculating line totals, tax, and bill grand total in real time.
  - Clears search input immediately for continuous, hands-free barcode scanning at the checkout counter.
- **Inventory Stock Management via Barcode (`InventoryView.tsx`):**
  - Scanning in the inventory screen opens the **Quick Scan Stock Manager Modal** displaying current stock in hand, MRP, and purchase cost.
  - **1-Click Quick Stock In:** Fast buttons (`+1 Pack`, `+5`, `+10`, `+25`, `+50 Packs`) for high-speed shipment receiving.
  - **Rapid Continuous Mode:** Optional toggle to auto-receive `+1 Pack` on each scan with zero mouse clicks.
  - **New Product Auto-Cataloging:** If an unrecognized barcode is scanned, the system automatically opens the "+ Add New Item" modal with the scanned barcode pre-filled.

### 7. Full Mobile & Tablet Responsive Architecture (`Navbar.tsx`, `App.tsx`, `KhataView.tsx`, `BillingView.tsx`, `InventoryView.tsx`, `SearchableSelect.tsx`)
- **Native-App-Grade Mobile Bottom Navigation Bar (`Navbar.tsx`, `App.tsx`):**
  - **Clean Mobile Header:** Desktop navigation links hide on mobile devices (`md:hidden`), leaving a streamlined top header with store badge, branding gear, role pill, and logout.
  - **Fixed Bottom Navigation Bar:** High-touch, 5-tab persistent bottom bar for smartphones and tablets (`Home`, `Khata`, `Stock`, `POS Bill`, `Reports`). POS Bill is highlighted with an elevated action circle.
  - **Bottom Clearance & Responsive Margins (`App.tsx`):** `<main>` container uses `p-2.5 sm:p-6 lg:p-8 pb-24 md:pb-8` to ensure all screen contents and buttons are 100% visible without being obscured by the bottom navigation bar.
- **Master-Detail Flow for Mobile Khata Ledger (`KhataView.tsx`):**
  - On desktop (`lg:grid lg:grid-cols-12`), customer list (5 cols) and ledger statements (7 cols) display side-by-side.
  - On smartphones/tablets (`< lg`):
    - When no customer is selected: Displays the full-width Customer & Supplier directory.
    - When a customer is tapped: Seamlessly slides into the Customer Ledger Statement & Udhaar Settlement view full-width.
    - Prominent `← Back to Customers` button in the header instantly returns to the list view.
  - Fluid height container (`min-h-[500px] lg:h-[calc(100vh-8.5rem)]`) eliminates double scrollbar squishing.
  - Multilingual WhatsApp reminder buttons wrap cleanly on mobile screens (`w-full sm:w-auto`).
- **Responsive Mobile POS Counter & Sticky Checkout Summary (`BillingView.tsx`):**
  - **Mobile Tab Switcher:** Dual-pill toggle on `< lg` between `🛒 Items & Cart` and `💳 Checkout & Pay` with live item counts and total amount badges.
  - **Sticky Bottom Checkout Bar:** When items are added to the cart on mobile, a floating bottom summary bar shows total items, price (`₹X`), and a 1-tap `Proceed to Pay →` button.
  - **Top Back-to-Cart Button:** When in the mobile checkout view, a prominent `← Back to Cart` button lets cashiers adjust items without losing payment state.
  - Search input, barcode camera scan, voice POS, and price tier switches wrap into mobile touch-friendly buttons.
- **Responsive Inventory Catalog & Modals (`InventoryView.tsx`, `SearchableSelect.tsx`):**
  - Search and category dropdowns adapt to full-width stacking on mobile.
  - Category combobox and `SearchableSelect` dropdown popovers enforce `max-w-[calc(100vw-1.5rem)]` to prevent horizontal screen bleeds on narrow displays.
  - All application modals (`showAddItemModal`, `showAdjustModal`, `showScanStockModal`, `showSettleModal`, `showTxnModal`) use `my-auto max-h-[90vh] overflow-y-auto` and `p-4 sm:p-6` to fit within phone screen bounds even when mobile keyboards pop up.

### 8. Stock Register App Engine: Aavak-Javak Logbook, Physical Shelf Tally & Item Passbook (`InventoryView.tsx`, `InventoryService.cs`)
- **Daily Stock Register (Aavak - Javak Logbook):**
  - Date-filtered logbook providing full retail accountability:
    - **Opening Stock:** Historical inventory balance at start of date.
    - **Inward (Aavak / आवक):** Aggregates Purchases (`PURCHASE`), Inward Adjustments (`ADJUSTMENT_ADD`), and Customer Sales Returns (`SALE_RETURN`).
    - **Outward (Javak / जावक):** Aggregates POS Sales (`SALE`) and Outward Adjustments (`ADJUSTMENT_SUB`).
    - **Closing Stock:** Verified physical/book stock at close of business.
    - **Valuation & Retail Margin:** Total purchase valuation, retail value, and gross profit margin percentage.
  - Official **Print Register** button rendering formal A4 printable Daily Stock Ledger.
- **Physical Shelf Tally & Stock Audit Session:**
  - Cashier or stock manager walks store aisles scanning barcodes or counting shelf units.
  - **Live 3-Way Reconciliation:** Real-time formula `Difference = Physical Count - Book Stock`.
  - **Status Flagging:** `SURPLUS` (green), `SHORTAGE` (red), `MATCHED` (slate).
  - Reason selector (*Theft/Shoplifting, Leakage/Damage, Billing Error, Supplier Mismatch, Sampling*).
  - **1-Click Discrepancy Reconcile:** Automatically adjusts book stock with a single click, plays audit audio beep, and creates `AUDIT_RECONCILE` stock movements.
  - Printable **Audit Session Summary Report**.
- **Executive History per Item Modal (Stock Passbook):**
  - Line-by-line chronological stock movements for any item.
  - Filter pills: `All Records`, `Sales Only`, `Inward Only`, `Audits Only`, `Adjustments Only`.
  - Inward sum, outward sum, and audit counter KPI badges.
  - Dedicated printable **Item Stock Statement**.

### 9. Sales Return & Credit Note Engine: Stock Restoration, Udhaar Adjustment & Direct WhatsApp Dispatch (`BillingView.tsx`, `BillingService.cs`, `whatsappHelper.ts`)
- **Separate Return Entry (Credit Note `#CN-YYYYMMDD-XXXX`):**
  - Generates an immutable, uniquely sequenced Credit Note document (`InvoiceType = "SALE_RETURN"`).
  - Original sales invoices (`#INV-...`) remain 100% intact for accounting audits, updating status to `"PARTIALLY_RETURNED"` or `"RETURNED"`.
- **Full & Partial Item Returns:**
  - Cashier picks which line items from the original bill are being returned.
  - Quantity controls clamped between 1 and original billed quantity.
  - Return reasons: *Defective / Damaged, Wrong Item Sold, Customer Changed Mind, Expired / Quality Issue, Excess Quantity Billed*.
- **Automatic Stock Restoration (+Shelf Count):**
  - Returned quantities are restored directly back to `inventoryItem.CurrentStock`.
  - Emits `StockMovement` of type `"SALE_RETURN"` with original invoice reference.
  - Automatically flows into the Daily Stock Register Inward column (आवक) and item passbook ledger.
- **Flexible Financial Settlement Modes:**
  - `DEDUCT_UDHAAR`: Immediately subtracts the refund amount from the customer's ledger debt (`party.CurrentBalance -= refundAmount`) and records a `CREDIT` transaction (`PaymentMode = "CREDIT_NOTE"`).
  - `CASH`: Counter cash payout.
  - `UPI`: Digital bank/UPI payout.
  - `STORE_CREDIT`: Issued as store credit note balance for future purchases.
- **Dual-Format Printable Credit Note:**
  - **Thermal 80mm Voucher:** Compact counter receipt with store logo, GSTIN, `#CN-...` number, original invoice reference, returned lines, refund mode, and restock confirmation.
  - **A4 Full Page Credit Note:** Formal Tax Credit Note voucher with two-column layout, customer details, tax reversals, return reason, notes, and authorized signature.
- **Direct WhatsApp Dispatch:**
  - Dispatches formatted Credit Note directly to the customer's WhatsApp without opening extra browser tabs via `sendWhatsAppCreditNoteDirect`.
- **History & Ledger Integration:**
  - `BillingView.tsx`: Document Type Filter (`All`, `Sales Invoices`, `Returns / Credit Notes`), 5th Metric Card for Total Returns, and status badges (`RETURNED`, `PARTIAL RETURN`, `REFUNDED`).
  - `KhataView.tsx`: Displays return badges in customer statement passbook.
  - `InventoryView.tsx`: `↩️ SALE_RETURN` badge and inward inclusion in stock movements.

---

## 11. Directory Map & Code Structure

```text
khatabook/
├── AGENT.md                       # Comprehensive architecture & prompt guide (this file)
├── README.md                      # Quick start guide
├── run-api.ps1                    # Script to start .NET backend on port 5260
├── run-ui.ps1                     # Script to start React frontend on port 3000
│
├── src/
│   ├── Khatabook.Api/             # ASP.NET Core Web API (.NET 10 LTS Clean Modular Architecture)
│   │   ├── Domain/
│   │   │   ├── Common/
│   │   │   │   └── IEntity.cs     # Base generic entity contract
│   │   │   └── Entities/
│   │   │       ├── Tenant.cs, MasterUser.cs, UserTenant.cs # Master DB entities (UpiId, UpiPayeeName)
│   │   │       ├── Party.cs, Item.cs, StockMovement.cs    # WholesalePrice, SecondaryUnit, Ratio
│   │   │       └── Invoice.cs, InvoiceItem.cs, Transaction.cs # PriceTier support
│   │   ├── DTOs/                  # Module-wise DTO records
│   │   │   ├── Auth/AuthDtos.cs
│   │   │   ├── Tenants/TenantDtos.cs # Branding & UPI fields
│   │   │   ├── Parties/PartyDtos.cs
│   │   │   ├── Inventory/ItemDtos.cs # Wholesale & UOM fields
│   │   │   ├── Billing/InvoiceDtos.cs# PriceTier & InvoiceReturnItemRequest / CreateInvoiceReturnRequest
│   │   │   ├── Transactions/TransactionDtos.cs
│   │   │   └── Migration/MigrationDtos.cs
│   │   ├── Repositories/          # Modular repository interfaces and linq2db implementations
│   │   │   ├── GenericRepository.cs, IGenericRepository.cs # Common Generic CRUD
│   │   │   ├── Tenants/           # ITenantRepository & TenantRepository (Role lookup)
│   │   │   ├── Parties/           # IPartyRepository & PartyRepository
│   │   │   ├── Inventory/         # IItemRepo, ItemRepo, IStockMovementRepo, StockMovementRepo
│   │   │   ├── Billing/           # IInvoiceRepository & InvoiceRepository
│   │   │   └── Transactions/      # ITransactionRepository & TransactionRepository
│   │   ├── Services/              # Modular domain business services
│   │   │   ├── Auth/              # IAuthService & AuthService (Role resolution)
│   │   │   ├── Parties/           # IPartyService & PartyService (FIFO Multi-Bill Settlement)
│   │   │   ├── Inventory/         # IInventoryService & InventoryService (Daily Stock Register & Reconcile)
│   │   │   ├── Billing/           # IBillingService & BillingService (ProcessInvoiceReturnAsync & Credit Notes)
│   │   │   ├── Reports/           # IReportService & ReportService
│   │   │   └── Migration/         # IMigrationService & MigrationService
│   │   ├── Controllers/           # Thin HTTP Controllers
│   │   │   ├── AuthController.cs
│   │   │   ├── AdminController.cs    # POST /api/admin/login, GET /verify, IsAdminAuthorized guard
│   │   │   ├── PartiesController.cs, ItemsController.cs, InvoicesController.cs (POST /api/invoices/return)
│   │   │   ├── TransactionsController.cs, StockMovementsController.cs
│   │   │   ├── TenantsController.cs, ReportsController.cs, MigrationController.cs
│   │   ├── Infrastructure/
│   │   │   ├── Context/           # ITenantContext & TenantMiddleware (resolves X-Tenant-Code)
│   │   │   ├── Data/              # MasterDataConnection, TenantDataConnection, TenantDatabaseService
│   │   │   └── Logging/           # ApiAuditLoggingMiddleware.cs, DeviceDetector.cs, PayloadSanitizer.cs
│   │   ├── Migrations/
│   │   │   ├── DatabaseMigrator.cs # DbUp parallel migration engine runner (Parallel.ForEachAsync)
│   │   │   ├── Master/Scripts/    # 001..008 (branding, UPI, audit_logs)
│   │   │   └── Tenant/Scripts/    # 001..006 (native names, wholesale, UOM, soft delete)
│   │   ├── appsettings.json       # PostgreSQL connection string, Serilog config & AdminAuth credentials
│   │   ├── Program.cs             # DI container, Serilog, Swagger, Middleware pipeline, Parallel startup migrations
│   │   └── Properties/
│   │       └── launchSettings.json# Configured to port 5260
│   │
│   └── khatabook-ui/              # React 19 + TypeScript + Vite + Tailwind CSS (stockstorekhata-ui)
│       ├── src/
│       │   ├── components/
│       │   │   ├── Navbar.tsx     # Clean top nav with StockStoreKhata logo, role badge & mobile bottom bar
│       │   │   ├── StoreSettingsModal.tsx # Logo upload, tagline, GSTIN & UPI VPA configuration
│       │   │   ├── SearchableSelect.tsx   # Fast searchable combobox with scrolling pagination (pageSize=25)
│       │   │   ├── Pagination.tsx         # Universal accessible pagination with page size and dark mode support
│       │   │   └── BarcodeCameraScanner.tsx # Dual 1D/2D camera barcode scanner with targeting reticle
│       │   ├── pages/
│       │   │   ├── DashboardView.tsx # Overview with 4-KPI cards & quick actions
│       │   │   ├── KhataView.tsx     # Customer ledger with AI Credit Score, FIFO Settlement, Pagination & Excel/PDF
│       │   │   ├── InventoryView.tsx # Daily Stock Register (Aavak-Javak), Shelf Tally Audit, Pagination & Exports
│       │   │   ├── BillingView.tsx   # POS Counter, Voice POS, UPI Modal, Returns/Credit Note, SearchableSelect Product Picker
│       │   │   ├── MigrationView.tsx # 3-tab legacy data migration wizard (Parties, Items, Invoices)
│       │   │   ├── ReportsView.tsx   # Daybook, Stock valuation, Outstanding dues
│       │   │   ├── AuthView.tsx      # StockStoreKhata Login & Retailer Self-Registration portal
│       │   │   └── AdminView.tsx     # Super Admin Security Console, Tenant Registry, Audit Telemetry & Exports
│       │   ├── services/          # Modular API services
│       │   │   ├── apiClient.ts      # Axios base client with X-Tenant-Code and X-Admin-Token interceptors
│       │   │   ├── authService.ts
│       │   │   ├── tenantService.ts  # adminLogin, verifyAdminSession, toggleTenantActive, getAuditLogs
│       │   │   ├── partyService.ts, itemService.ts, billingService.ts, reportService.ts
│       │   │   └── api.ts            # Unified API facade exporting all modules
│       │   ├── types/             # Modular TypeScript domain definitions
│       │   │   ├── tenant.ts, party.ts, item.ts, invoice.ts (SALE_RETURN / RETURNED), transaction.ts
│       │   │   └── index.ts          # Aggregate types export
│       │   ├── utils/             # Futuristic utilities
│       │   │   ├── exportUtils.ts    # Universal multi-format Excel (.xlsx) and PDF (.pdf) export engine
│       │   │   ├── gstr1ExcelExport.ts# Multi-sheet GSTR-1 Excel (.xlsx) & GST Portal JSON generator
│       │   │   ├── sessionSecurity.ts# Configurable auto-logout, session lock, single-device policy & back-button trap
│       │   │   ├── tabGuard.ts       # Single browser tab lock & cross-tab takeover engine (BroadcastChannel)
│       │   │   ├── offlineDb.ts      # IndexedDB offline-first storage & background sync engine
│       │   │   ├── upiQr.ts          # Dynamic UPI QR generation
│       │   │   ├── whatsappHelper.ts # Zero-tab direct WhatsApp reminders, bills & Credit Notes
│       │   │   ├── creditScorer.ts   # AI Credit Risk Scorer (SAFE, MODERATE, HIGH_RISK)
│       │   │   ├── voiceParser.ts    # Multilingual AI Voice POS speech parser
│       │   │   └── audioBeep.ts      # Native Web Audio retail laser beep and audit cues
│       │   ├── App.tsx            # Hash Route Map, Auth Guard, Multi-Tab Lock, Single Device Guard, Inactivity Manager
│       │   └── index.css          # Tailwind CSS v4 setup with clean slate/indigo styling
│       └── vite.config.ts         # Configured proxy to http://localhost:5260
```

---

## 12. Run & Verification Commands

### 1. Database Connection String:
In `src/Khatabook.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=khatabook;User Id=postgres;Password=YOUR_PASSWORD;"
  }
}
```

### 2. Start Backend API:
```powershell
.\run-api.ps1
# OR
cd src/Khatabook.Api
dotnet run --urls="http://localhost:5260"
```
* **API Endpoint:** `http://localhost:5260`
* **Swagger UI:** `http://localhost:5260/swagger`

### 3. Start Frontend UI:
```powershell
.\run-ui.ps1
# OR
cd src/khatabook-ui
npm run dev
```
* **Frontend Portal:** `http://localhost:3000`

### 4. Built-in Demo Credentials:
* **Agro Store:** Store Code `agro1`, Password `admin` (or `123456`)
* **Kirana Store:** Store Code `kirana1`, Password `123456`
* **Super Admin Security Portal:** Access at `#/admin` (or click "Super Admin Panel" in the login footer).
  - Username: `admin`
  - Password: `admin123` (or click 1-click Demo credentials pill)
* **Register Fresh Retailer:** Click "Register New Business" on login screen to launch any new store with its own database!

---

## 13. Agent Prompts & Extension Cookbook

Use these exact prompts when directing future subagents or developer LLMs to continue work on this repository:

### Prompt 1: Adding a New Database-per-Tenant Migration
```text
You are modifying the Khatabook multi-tenant platform.
Task: Add a new column or table to all tenant databases.
Rules:
1. Create a new numbered SQL script in src/Khatabook.Api/Migrations/Tenant/Scripts/ (e.g. 007_feature_name.sql).
2. Update the corresponding C# Entity in src/Khatabook.Api/Domain/Entities/ with linq2db Column attributes.
3. Update the DTOs, Repositories, and Services to expose the new fields.
4. DatabaseMigrator.cs will automatically apply this script to all active tenant databases on application startup.
5. Verify with 'dotnet build src/Khatabook.Api'.
```

### Prompt 2: Adding a New POS Feature or AI Tool
```text
You are extending the Khatabook React 19 frontend.
Task: Add a new retail utility or AI tool.
Rules:
1. Place helper/AI algorithms in src/khatabook-ui/src/utils/.
2. Use strong TypeScript typings in src/khatabook-ui/src/types/.
3. Integrate into BillingView, InventoryView, or KhataView.
4. Maintain bilingual support (English + Native regional scripts like Hindi/Gujarati).
5. Verify build with 'npm run build' inside src/khatabook-ui.
```

### Prompt 3: Adding a New Industry Profile
```text
You are configuring a new industry type in Khatabook (e.g. Hardware / Paints or Footwear).
Rules:
1. Update src/Khatabook.Api/Domain/Entities/Tenant.cs and seed data in 003_seed_master_data.sql.
2. In InventoryView and BillingView, add specialized unit dropdowns and category presets.
3. Update getStoreIcon in Navbar.tsx to add the industry icon.
```

### Prompt 4: Extending Universal Pagination, Sorting & Multi-Format Exports (Excel & PDF)
```text
You are extending data tables and report views in StockStoreKhata.
Task: Add pagination, column sorting, or Excel/PDF exports to a data table or report.
Rules:
1. Wrap tabular data with the universal '<Pagination>' component from 'src/components/Pagination.tsx'. Provide 'currentPage', 'totalPages', 'totalItems', 'pageSize', 'onPageChange', and 'onPageSizeChange'.
2. Use direction arrows ('ArrowUpDown', 'ArrowUp', 'ArrowDown') on clickable table headers with a sort key and 'asc' / 'desc' state.
3. For dropdown selectors with large item counts, use 'SearchableSelect.tsx' which implements dynamic scrolling pagination (pageSize=25) so users can scroll to load more.
4. For data export, use helper functions from 'src/utils/exportUtils.ts' (e.g. 'exportToExcel' with auto-width columns or 'exportToPdf' with clean table styling).
5. Ensure 0 TypeScript errors with 'npm run build' in 'src/khatabook-ui'.
```

### Prompt 5: Adding or Protecting Administrative Endpoints with Super Admin Guard
```text
You are modifying backend admin functionality or the Super Admin console.
Task: Add a protected administrative API endpoint or extend the Super Admin portal.
Rules:
1. In 'AdminController.cs', annotate or protect the endpoint using 'if (!IsAdminAuthorized(Request)) return Unauthorized("Super admin token required.");'.
2. In 'src/khatabook-ui/src/services/apiClient.ts', ensure 'X-Admin-Token' from 'localStorage.getItem("admin_token")' is attached to all outbound requests.
3. In 'AdminView.tsx', handle 401 Unauthorized responses by calling 'handleAdminLogout()' and alerting the user that the session has expired.
4. Verify backend with 'dotnet build src/Khatabook.Api' and frontend with 'npm run build'.
```

### Prompt 6: Modifying Request Audit Telemetry, Serilog, or Device Detection
```text
You are extending API observability or security logging in Khatabook.
Task: Add or adjust fields captured in the central master audit log.
Rules:
1. Update 'ApiAuditLoggingMiddleware.cs' to capture any new headers or context.
2. If changing the database schema, add a new script in 'src/Khatabook.Api/Migrations/Master/Scripts/' modifying 'khatabook_master.audit_logs'.
3. In 'PayloadSanitizer.cs', ensure any sensitive tokens, PINs, or credentials remain masked with '***MASKED***'.
4. In 'DeviceDetector.cs', preserve zero-latency regex-based device categorization ('DESKTOP', 'MOBILE_ANDROID', 'MOBILE_IOS', 'TABLET').
5. Ensure log persistence runs non-blocking fire-and-forget in the background without degrading endpoint response times.
```

---

## 14. Developer & Agent Rules of Engagement

1. **Maintain N-Tier Separation:** Never place business logic directly in Controllers or SQL queries directly in Services. Always use `Controller -> Service -> Repository -> linq2db`.
2. **Financial Math Precision:** Always use `decimal` in C# and `NUMERIC(14, 2)` in PostgreSQL for monetary balances. Never use `float` or `double`.
3. **Database-per-Tenant Integrity:** Never query domain entities without routing to the tenant's dedicated database via `TenantDataConnection`.
4. **Auto-Migration Rule:** Never run ad-hoc manual SQL commands in pgAdmin. Always write numbered `.sql` scripts in `Migrations/Tenant/Scripts/` (or `Master/Scripts/`) so that `DbUp` automatically propagates changes to all retailer databases upon deployment.
5. **No Broken Builds:** Every code modification must compile cleanly with `dotnet build src/Khatabook.Api` (0 warnings, 0 errors) and `npm run build` in `src/khatabook-ui` (0 errors).
6. **Zero Hard Deletes Rule:** Never execute hard SQL deletes (`DELETE FROM ...`) anywhere in business workflows. Always implement soft-delete via `ISoftDeletable` (`IsActive = false, UpdatedAt = UtcNow`) and provide safe 1-click reactivation.

---

## 15. Soft Delete & Active / Inactive Record Lifecycle Architecture

### Architectural Principles:
1. **Zero Data Loss & Immutable Audit History:** In a financial ERP and POS system, hard-deleting records destroys historical ledger integrity, invoice sequencing, tax audit trails, and inventory balance reconciliations.
2. **Standardized Interface:** All domain entities implement `ISoftDeletable`:
   ```csharp
   public interface ISoftDeletable
   {
       bool IsActive { get; set; }
   }
   ```
   Entities covered: `Item`, `Party`, `Invoice`, `Transaction`, `Tenant`, `MasterUser`, `UserTenant`.

3. **Generic Repository Enforcement:**
   `GenericRepository<T>.DeleteAsync(T entity)` intercepts deletions:
   ```csharp
   if (entity is ISoftDeletable softDeletable)
   {
       softDeletable.IsActive = false;
       SetUpdatedAtIfExists(entity);
       await Db.UpdateAsync(entity);
       return;
   }
   // Fallback for non-soft-deletable entities only
   ```
   Additional repository operations:
   - `ToggleActiveAsync(Guid id)`: Flips active/inactive status and updates timestamp.
   - `SetActiveStatusAsync(Guid id, bool isActive)`: Explicitly sets status.

4. **Default Query Behavior & Backward Compatibility:**
   - Default filter across repositories: `isActive = true`. Regular POS searches, active item dropdowns, and ledger lookups only return active items by default.
   - Explicit parameter `bool? isActive = null`: Allows querying all records (active + inactive) or filtered records (`isActive = false`).

5. **Financial Reversal on Ledger Soft-Delete:**
   - When a `DEBIT` transaction (Udhaar given) is soft-deleted, `party.CurrentBalance` is reduced by the transaction amount.
   - When a `CREDIT` transaction (Payment received) is soft-deleted, `party.CurrentBalance` is increased by the transaction amount.
   - Reactivating a soft-deleted transaction reverses this arithmetic accurately to maintain mathematical balance integrity.

6. **Invoice Voiding Workflow:**
   - Invoices are never removed from disk/database. Soft-deleting an invoice marks it as `VOIDED` (`IsActive = false`).
   - Line items, customer associations, and historical timestamps remain preserved.
   - Voided bills can be reactivated / restored with 1-click.

7. **Database Migrations:**
   - Tenant DB migration `006_add_soft_delete_to_invoices_and_txns.sql`: Added `is_active` (boolean, default true) and `updated_at` (timestamptz) with B-tree indexes to `invoices` and `transactions`.
   - Master DB migration `007_add_soft_delete_to_user_tenants.sql`: Added `is_active` and `updated_at` to `user_tenants`.

8. **Frontend Experience:**
   - **Catalog & Inventory:** Status filter pills (`Active`, `Inactive`, `All Products`), status badges, 1-click active/inactive toggle, safe soft-delete modal, and instant restore button.
   - **Customer & Supplier Khata:** Active / Inactive / All customer filter, soft-delete account modal (debt preserved), soft-delete transaction modal with real-time balance reversal advisory, and 1-click restore.
   - **Billing & POS History:** Document status dropdown (`Active Bills Only`, `Voided / Inactive`, `All Documents`), voided badge styling, safe void modal, and restore action.
   - **Super Admin:** Retailers registry active vs suspended badges, metric cards, status filter pills, and 1-click store suspend / activate toggles.

---

## 16. High-Scale Multi-Tenant Migration & Connection Pool Architecture (1,000+ Customer Engine)

### The Scale Challenge:
In a Database-per-Tenant architecture, 1,000 customers mean 1,000 physical PostgreSQL databases. A naive sequential migration loop (`foreach`) causes a 45–60 second server startup delay and risks exhausting PostgreSQL's `max_connections` (default 100).

### Implemented High-Scale Solutions:
1. **Parallel Bounded Migrations (`Parallel.ForEachAsync`):**
   - Implemented in `DatabaseMigrator.MigrateAllTenantDatabasesAsync(..., maxDegreeOfParallelism: 15)`.
   - Uses 15 concurrent worker threads to check and migrate databases simultaneously.
   - Drops boot latency from ~50 seconds down to ~2–3 seconds for 1,000 databases.
   - Per-tenant error isolation: If one database encounters an error, it logs the failure and continues migrating the other 999 tenants without crashing the server.

2. **Just-In-Time (JIT) Migration Cache:**
   - In-memory `ConcurrentDictionary<string, bool> MigratedTenantDbs` tracks all verified databases during the application lifecycle.
   - In `TenantDatabaseService.GetTenantConnectionStringAsync`: `DatabaseMigrator.EnsureTenantMigrated(tenantConnStr, dbName, _logger)` performs JIT schema verification.
   - First call verifies schema; all subsequent calls return in **0 milliseconds**.

3. **Agile Connection Pool Management (`BuildOptimizedTenantConnectionStringBuilder`):**
   - `MinPoolSize = 0`: Inactive tenants hold **0** open idle connections.
   - `MaxPoolSize = 5`: Caps maximum connections per tenant, preventing connection pool blowout.
   - `ConnectionIdleLifetime = 15`: Closes idle connections after 15 seconds.
   - `ConnectionPruningInterval = 10`: Prunes idle sockets every 10 seconds.
   - **Result:** Even with 1,000+ registered databases, only currently active cashier sessions occupy PostgreSQL sockets, comfortably staying under PostgreSQL's connection limits.

---

## 17. Full-Context Request Audit Logging & Serilog Architecture

### Architectural Decision: Master DB + Rolling JSON Sinks
All incoming API requests are captured end-to-end and stored in:
1. **Centralized Master Database (`khatabook_master.audit_logs`):**
   - **Why Master DB instead of Tenant DB:** Captures pre-authentication events (logins, registrations, 401 Unauthorized, token refreshes) where tenant context is not yet resolved. Provides Super Admins with a single-pane-of-glass trace across the entire SaaS ecosystem without cross-querying hundreds of tenant databases. Prevents high-volume HTTP telemetry from bloating tenant POS accounting databases.
2. **Rolling Daily JSON Files (`logs/stockstorekhata-audit-.json`):**
   - High-performance, human-readable structured logs written by Serilog File Sink with 30-day retention and file size limits (50 MB).

### Audit Table Schema (`khatabook_master.audit_logs`):
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    correlation_id VARCHAR(64) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(256) NOT NULL,
    status_code INT NOT NULL,
    duration_ms BIGINT NOT NULL,
    tenant_code VARCHAR(64),
    tenant_id UUID,
    user_id UUID,
    user_name VARCHAR(128),
    user_role VARCHAR(64),
    client_ip VARCHAR(64),
    device_type VARCHAR(32) NOT NULL DEFAULT 'DESKTOP',  -- DESKTOP, MOBILE_ANDROID, MOBILE_IOS, TABLET
    platform_os VARCHAR(64),
    user_agent TEXT,
    request_payload TEXT,
    response_payload TEXT,
    error_message TEXT
);
```

### Key Components:
1. **Device & OS Detection (`DeviceDetector.cs`):**
   - Inspects `User-Agent` and custom `X-Client-Device` headers to categorize clients into `DESKTOP`, `MOBILE_IOS`, `MOBILE_ANDROID`, or `TABLET`.
   - Extracts operating system (`Windows`, `macOS`, `Android`, `iOS`, `Linux`) and browser.
   - Extracts real client IP resolving reverse proxy headers (`CF-Connecting-IP`, `X-Forwarded-For`, `X-Real-IP`, `RemoteIpAddress`).

2. **Recursive Payload Sanitization (`PayloadSanitizer.cs`):**
   - Recursively parses JSON bodies and replaces sensitive fields (`password`, `passwordHash`, `token`, `secret`, `pin`, `cvv`, `auth`) with `"***MASKED***"`.
   - Clamps raw bodies exceeding 32 KB with truncation markers to prevent memory bloat on large file uploads or batch imports.

3. **Zero-Latency Non-Blocking Middleware (`ApiAuditLoggingMiddleware.cs`):**
   - Uses `context.Request.EnableBuffering()` so request streams can be inspected and rewound for controllers.
   - Swaps `context.Response.Body` with a temporary `MemoryStream` to intercept outgoing response payloads and status codes before copying to original body stream.
   - Emits structured log event to Serilog (`Log.ForContext("AuditLog", ...)`).
   - Persists to `audit_logs` table via fire-and-forget background task (`_ = PersistAuditLogAsync(...)`) using `IServiceScopeFactory`, ensuring **0 ms latency overhead** on API responses.

4. **Super Admin Observability Portal (`AdminView.tsx`):**
   - "Full Audit Logs & Requests" tab with real-time refresh.
   - Comprehensive filter bar: Search query (endpoint, IP, user, correlation ID), Device category filter, Store/Tenant dropdown, Status code filter (All, 2xx Success, 4xx Client Error, 5xx Server Error).
   - Live audit table with status badge, HTTP method pill, duration latency, user identity, client device, and IP address.
   - **Inspect Trace Modal:** Deep inspection of correlation ID, duration, client device, raw user-agent, auto-masked request body JSON, and client response JSON.

---

## 18. Universal Pagination, Sorting, Scrolling Dropdowns & Multi-Format Exports (Excel & PDF)

### Architectural Goals:
1. **Zero Clutter & Scalable Performance:** Prevent long tables (hundreds of items, invoices, customers, and audit logs) from overwhelming the DOM or causing viewport lag.
2. **Accessible Multi-Page Navigation:** Standardized pagination across all modules with customizable page sizes.
3. **Multi-Format Export Readiness:** One-click instant offline reporting in formatted Excel (`.xlsx`) and presentation-ready PDF (`.pdf`) format.
4. **Intuitive Filtering over Plain Search:** Replace lonely text search bars with rich category/status dropdowns and infinite-scrolling selects.

### 1. Universal Multi-Format Export Engine (`src/utils/exportUtils.ts`)
- **Excel Export Engine (`exportToExcel`):**
  - Uses `xlsx` (SheetJS) to compile structured worksheets.
  - Automatically calculates dynamic column widths based on maximum cell string lengths.
  - Generates sanitized filenames: `{prefix}_{timestamp}.xlsx`.
- **PDF Export Engine (`exportToPdf`):**
  - Powered by `jspdf` and `jspdf-autotable`.
  - Professional header with Document Title, generated timestamp, and clean slate table borders.
  - Automatic column wrapping, alternating row shading, and footer page numbering (`Page X of Y`).
- **Standardized Export Handlers:**
  - `exportInventoryToExcel / exportInventoryToPdf`: Exports SKU, Name, Native Name, Category, Unit, Cost, Sell Price, Wholesale Price, Stock in Hand, and Stock Valuation.
  - `exportPartiesToExcel / exportPartiesToPdf`: Exports Customer/Supplier Name, Phone, Address, Credit Limit, and Net Balance.
  - `exportCustomerLedgerToExcel / exportCustomerLedgerToPdf`: Generates official customer statements with Date, Type, Description, Payment Mode, Debit, Credit, and Running Balance.
  - `exportInvoicesToExcel / exportInvoicesToPdf`: Exports Invoice Number, Type, Customer, Date, Payment Mode, Subtotal, Tax, and Grand Total.
  - `exportTenantsToExcel / exportTenantsToPdf`: Super Admin registry export of stores, codes, business types, databases, and active states.
  - `exportAuditLogsToExcel / exportAuditLogsToPdf`: Platform audit telemetry export with timestamp, correlation ID, method, endpoint, status code, duration, IP, device, and user.

### 2. Universal Pagination Component (`src/components/Pagination.tsx`)
- Standardized props:
  ```typescript
  interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[]; // Defaults to [10, 25, 50, 100]
    variant?: 'light' | 'dark';
  }
  ```
- **Ellipsis Pagination Logic:** Computes dynamic visible page numbers with surrounding ellipses when total pages exceed 5.
- **Fast Boundary Buttons:** Quick jump to First (`<<`), Previous (`<`), Next (`>`), and Last (`>>`) page.
- **Variant Support:** Clean light mode for store POS / Khata / Stock views and dark mode (`variant="dark"`) for the Super Admin console.

### 3. Dynamic Scrolling Pagination Dropdowns (`src/components/SearchableSelect.tsx`)
- **Infinite Scrolling in Comboboxes:**
  - Employs incremental batch loading (`pageSize = 25`).
  - Scroll listener detects when user scrolls near the bottom (`scrollTop + clientHeight >= scrollHeight - 30`) and dynamically loads the next 25 options.
  - Keyboard arrow navigation automatically advances the rendered batch if navigated past current visible items.
  - Counter badge displays `Showing X of Y items (scroll for more)` when filtered results exceed the page size.
- **Replaced Lonely Search Bars with Rich Filter Dropdowns:**
  - **POS Billing (`BillingView.tsx`):** Added Category filter dropdown and `<SearchableSelect>` Product Picker alongside barcode/text search.
  - **Khata Directory (`KhataView.tsx`):** Added Balance Status filter dropdown (`All`, `Udhaar / Get`, `Advance / Give`, `Settled ₹0`) and Sort Order dropdown.
  - **Khata Customer Ledger (`KhataView.tsx`):** Added Transaction Type filter (`All`, `Debits`, `Credits`), Date Range filter (`All Time`, `This Month`, `Last 30 Days`, `Last 90 Days`), and Sort dropdown.
  - **Inventory Catalog (`InventoryView.tsx`):** Added Stock Level filter dropdown (`All`, `In Stock`, `Low Stock`, `Out of Stock`, `Negative Stock`).
  - **Billing History (`BillingView.tsx`):** Added Payment Mode filter dropdown (`All`, `Cash`, `UPI`, `Card`, `Udhaar`) and Date Range filter dropdown.
- **Clickable Column Sorting Everywhere:**
  - Directional sort arrows (`ArrowUpDown`, `ArrowUp`, `ArrowDown`) on table headers across Inventory, Khata, Invoices, Admin Tenants, and Audit Logs.

---

## 19. Super Admin Authentication & Security Guard Engine

### Architectural Motivation:
In a multi-tenant platform, the Super Admin console provides visibility into all tenant databases, store activation states, and request audit telemetry. Securing this surface with dedicated authentication ensures store staff and walk-in users cannot access infrastructure controls.

### 1. Backend Security Guard (`AdminController.cs`)
- **Credentials DTO:**
  ```csharp
  public record AdminLoginRequest(string Username, string Password);
  ```
- **Login Endpoint (`POST /api/admin/login`):**
  - Verifies credentials against the `AdminAuth` section in `appsettings.json` (`admin` / `admin123` or `Admin@123`).
  - Supports fallback password hash verification against `khatabook_master.master_users` for accounts with role `SUPER_ADMIN`.
  - Returns a cryptographically unique session token: `adm_{Guid.NewGuid():N}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}` alongside user metadata.
- **Session Verification Endpoint (`GET /api/admin/verify`):**
  - Validates active token legitimacy without requiring password re-entry.
- **Administrative Guard Helper (`IsAdminAuthorized`):**
  - Enforces authorization on all `/api/admin/...` endpoints (`/tenants`, `/overview`, `/tenants/{id}/toggle-active`, `/audit-logs`).
  - Inspects `X-Admin-Token` or `Authorization: Bearer` headers.
  - Returns `401 Unauthorized` if token is missing or invalid.

### 2. Configuration (`appsettings.json`)
```json
"AdminAuth": {
  "Username": "admin",
  "Password": "admin123"
}
```

### 3. Outbound Header Interceptor (`src/services/apiClient.ts`)
- Automatically retrieves `localStorage.getItem('admin_token')` and attaches `X-Admin-Token` on all outbound requests.
- Keeps Super Admin authentication completely decoupled from tenant cashier tokens (`active_session_token`).

### 4. Super Admin Login UI Portal (`AdminView.tsx`)
- **Restricted Access Wall:** If `!adminToken`, renders a dark-mode security portal with glowing shield icon and restricted console badge.
- **Form Controls:**
  - Username & Password inputs with visibility toggle (`Eye` / `EyeOff`).
  - 1-Click Demo credential shortcut pill (`admin / admin123`) for fast testing.
  - Actionable error alert banners on invalid attempts.
- **Top Navigation Bar:**
  - Authenticated admin badge: `Admin: admin • SUPER_ADMIN` with a pulsing green status LED.
  - Dedicated **Logout Admin** button (`Power` icon) that clears `admin_token` and resets state.
- **Automatic 401 Interception:**
  - If any admin API call fails with `401 Unauthorized`, `handleAdminLogout()` is triggered automatically to flush the expired token and return to the login screen with an alert.
- **Exit Navigation:**
  - "Back to Store Login" link allows administrators to return to regular store login at any time.


