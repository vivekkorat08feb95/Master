# Khatabook & Retail ERP (Database-per-Tenant, Multi-Retailer)

A modern, high-performance retail billing, inventory, and ledger accounting application featuring:
- **Clean N-Tier Layered Architecture** (Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ linq2db $\rightarrow$ PostgreSQL).
- **Database-per-Tenant Isolation:** Each retailer customer has their own dedicated PostgreSQL database.
- **Auto-Migration Engine:** Pending schema changes automatically migrate across all tenant databases on startup via `DbUp`.
- **Customer-Wise Login & Self-Registration:** Retailers self-register and log into their own isolated store session (no cross-store switcher).
- **Super Admin Panel:** Monitor all registered retailers and their physical databases.
- **Swagger Documentation:** Available at `http://localhost:5260/swagger`.

---

## 🏬 Generic Retailer Support

- 🌾 **Agro Store** (Seeds, Fertilizers, Pesticides, Bags/Kg/Ltr, Batch tracking, Expiry alerts)
- 🛒 **Kirana & Grocery** (Groceries, FMCG, Packaged goods, Loose weight Kg/Gm)
- 💊 **Medical & Pharmacy** (Medicines, Strips/Tablets, Batch numbers, Expiry dates, Drug License)
- 🔧 **Vehicle Garage & Spare Parts** (Vehicle Numbers, Labor/Service charges, Part numbers)
- 📱 **Electronics & Mobile** (Serial / IMEI numbers, Warranty)
- 🏬 **General Retail Store**

---

## 🚀 Quick Start Guide

### 1. Database Configuration
In `src/Khatabook.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=khatabook;User Id=postgres;Password=YOUR_POSTGRES_PASSWORD;"
  }
}
```

### 2. Launch Backend API
```powershell
.\run-api.ps1
```
* **API Endpoint:** `http://localhost:5260`
* **Swagger UI:** `http://localhost:5260/swagger`

### 3. Launch Frontend UI
```powershell
.\run-ui.ps1
```
* **Web UI:** `http://localhost:3000`

### 4. Demo Credentials
* **Agro Retailer:** Code `agro1`, Password `admin` (or `123456`)
* **Kirana Retailer:** Code `kirana1`, Password `123456`
* Or click **Register New Business** to launch a brand-new retailer with its own database!
