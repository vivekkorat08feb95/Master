# 🚀 Khatabook Cloud Deployment Guide (Railway + Vercel / Railway)

This repository is fully configured for cloud deployment on Linux with **Docker**, **PostgreSQL**, **.NET 10 Web API**, and **React 19 (Vite)**.

---

## 🏗️ Architecture on Railway

```text
Railway Project
├── 🐘 PostgreSQL Database (Managed)
│    └── Connection string shared to API
├── ⚙️ Khatabook.Api (.NET 10)
│    └── Root Directory: /src/Khatabook.Api
│    └── Dockerfile: src/Khatabook.Api/Dockerfile
└── 💻 khatabook-ui (React 19) (Deploy on Vercel [Free] OR Railway)
     └── Points to: https://<your-api>.up.railway.app
```

---

## 📋 Step-by-Step Deployment Instructions

### STEP 1: Push Code to GitHub

Open PowerShell in `C:\vivekwork\khatabook` and run:

```powershell
cd C:\vivekwork\khatabook
git init
git add .
git commit -m "feat: setup cloud deployment with Docker and dynamic config"

# Create a new repository on GitHub (e.g. 'khatabook') and push:
git remote add origin https://github.com/<YOUR_USERNAME>/khatabook.git
git branch -M main
git push -u origin main
```

---

### STEP 2: Create Railway Project & Provision PostgreSQL

1. Go to [railway.app](https://railway.app) and sign in (via GitHub).
2. Click **New Project** → Select **Provision PostgreSQL**.
3. Railway will spin up a dedicated PostgreSQL instance.
4. Click on the **Postgres** service → Go to the **Variables** tab.
5. Note the following variables or copy the `DATABASE_URL`:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

> 💡 **Multi-Tenant Note:** Khatabook dynamically provisions isolated databases (`khatabook_tenant_<code >`). The default `postgres` superuser on Railway has full `CREATEDB` permissions, so automatic tenant provisioning works seamlessly!

---

### STEP 3: Deploy .NET 10 API Service on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo** → Select your `khatabook` repository.
2. Click on the newly created service → Go to **Settings**:
   - **Service Name:** `khatabook-api`
   - **Root Directory:** `/src/Khatabook.Api`
   - **Builder:** `Dockerfile` (Railway will automatically find `src/Khatabook.Api/Dockerfile`)
3. Go to the **Variables** tab and add:
   ```text
   ASPNETCORE_ENVIRONMENT = Production
   ConnectionStrings__DefaultConnection = Host=${{Postgres.PGHOST}};Port=${{Postgres.PGPORT}};Database=${{Postgres.PGDATABASE}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}};SSL Mode=Prefer;Trust Server Certificate=true;
   ```
   *(Railway allows referencing database variables using `${{Postgres.PGHOST}}` directly!)*
4. Go to **Settings** → **Networking** → Click **Generate Domain**.
   - You will get a public URL like: `https://khatabook-api-production.up.railway.app`
5. Test your live API:
   - Visit: `https://<YOUR_API_DOMAIN>/swagger`
   - The auto-migrator will automatically apply master migrations and seed initial default stores (`agro1`, `kirana1`).

---

### STEP 4: Deploy React Frontend

#### Option A: Deploy on Vercel (Recommended - 100% Free)
1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New...** → **Project** → Import your GitHub repository.
3. In **Project Settings**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click edit and select `src/khatabook-ui`
4. Expand **Environment Variables**:
   - Name: `VITE_API_URL`
   - Value: `https://<YOUR_RAILWAY_API_DOMAIN>` (e.g. `https://khatabook-api-production.up.railway.app`)
5. Click **Deploy**. Vercel will build and host your UI with free SSL and global CDN!

#### Option B: Deploy on Railway (All in one place)
1. In your Railway project, click **+ New** → **GitHub Repo** → Select `khatabook`.
2. Go to **Settings**:
   - **Service Name:** `khatabook-ui`
   - **Root Directory:** `/src/khatabook-ui`
   - **Builder:** `Dockerfile`
3. Go to **Variables**:
   - `VITE_API_URL = https://<YOUR_RAILWAY_API_DOMAIN>`
4. Go to **Settings** → **Networking** → **Generate Domain**.

---

### STEP 5: Accessing the Cloud Database Locally (DBeaver / pgAdmin)

To inspect or query your production databases from your local machine:
1. In Railway → Click on **Postgres** service → **Connect** tab.
2. Copy the **Public TCP Proxy** details:
   - Host: e.g. `junction.proxy.rlwy.net`
   - Port: e.g. `12345`
   - User: `postgres`
   - Password: (shown in Railway)
   - Database: `railway`
3. Connect using **pgAdmin**, **DBeaver**, or **VS Code Database Client**.
