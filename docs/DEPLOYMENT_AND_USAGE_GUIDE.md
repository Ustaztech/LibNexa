# LIBNEXA: Comprehensive Deployment & User Guide

**Mobile Library Catalog & Physical Book Circulation Management System**  
*Engineered for Nasarawa State University, Keffi (NSUK)*

---

## Table of Contents
1. [About the Application](#1-about-the-application)
   - [Monorepo Architecture](#monorepo-architecture)
   - [Core Technologies](#core-technologies)
   - [Key Capabilities & Modules](#key-capabilities--modules)
2. [Running on Localhost](#2-running-on-localhost)
   - [Prerequisites](#prerequisites)
   - [Step 1: Install All Dependencies](#step-1-install-all-dependencies)
   - [Step 2: Environment Configuration](#step-2-environment-configuration)
   - [Step 3: Database Synchronization & Seeding](#step-3-database-synchronization--seeding)
   - [Step 4: Launching Development Servers](#step-4-launching-development-servers)
   - [Default Administrative Accounts](#default-administrative-accounts)
   - [Interactive Swagger API Documentation](#interactive-swagger-api-documentation)
3. [User Persona Feature Walkthrough](#3-user-persona-feature-walkthrough)
   - [Student & Faculty Experience](#student--faculty-experience)
   - [Librarian Circulation Desk & Inventory](#librarian-circulation-desk--inventory)
   - [Super Administrator Management](#super-administrator-management)
   - [Automated Email Notification System](#automated-email-notification-system)
4. [Deployment Guide for Vercel & Production](#4-deployment-guide-for-vercel--production)
   - [Deployment Architecture Overview](#deployment-architecture-overview)
   - [Deploying the Web Portal on Vercel](#deploying-the-web-portal-on-vercel)
   - [Deploying the Backend API](#deploying-the-backend-api)
   - [Configuring Live SMTP Email Dispatch](#configuring-live-smtp-email-dispatch)
   - [Production Verification Checklist](#production-verification-checklist)

---

## 1. About the Application

**LIBNEXA** is an enterprise-grade academic library management platform designed to automate cataloging, book checkout, loan renewals, waitlist reservations, and email notifications for university libraries.

### Monorepo Architecture

The repository is organized as an npm workspace monorepo:

```
LibNexa/
├── apps/
│   ├── api/             # RESTful API Backend (Express, TypeScript, Prisma ORM)
│   ├── web/             # Single-Page Web Portal (React 18, Vite, Tailwind CSS, Lucide Icons)
│   └── mobile/          # Cross-platform Mobile App (React Native, Expo SDK, QR Digital ID)
├── packages/
│   └── shared/          # Shared domain contracts, NSUK taxonomy, fine calculator
├── database/
│   ├── schema.mysql.prisma # Production MySQL Prisma schema
│   └── init.mysql.sql   # Raw MySQL 8.0 DDL & relational constraints
├── docs/                # Architecture, guides, and deployment specifications
└── tests/               # Acceptance and automated verification test suites
```

### Core Technologies

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend REST API** | Node.js, Express, TypeScript, Zod Schema Validation, Helmet, CORS |
| **Database & ORM** | Prisma ORM 5.22, SQLite (zero-config dev), MySQL 8.0+ (production) |
| **Authentication** | JSON Web Tokens (Access + Refresh JWT), Bcrypt.js password hashing |
| **Email Service** | Nodemailer with responsive HTML templates (Live SMTP + Dev Simulated mode) |
| **Background Tasks** | Node-cron automated due date & overdue fine calculation scheduler |

### Key Capabilities & Modules

1. **Dual Physical-Copy Architecture**: Separates conceptual book titles (`Book`) from tangible shelf items (`BookCopy`), tracking exact accession numbers, shelf locations, and conditions (`NEW`, `GOOD`, `FAIR`, `DAMAGED`).
2. **Automated FIFO Waitlist Reservations**: When copies are exhausted, students join an automated queue. When copies are returned or registered, the next student is automatically promoted with a 48-hour pickup window.
3. **Automated Email Notifications**:
   - **New Book Arrivals**: Automatically emails all active library members when new titles are accessioned into the catalog.
   - **Book Availability Alerts**: Automatically emails waitlisted students when their hold is ready, and alerts students subscribed to out-of-stock books when copies are returned.
   - **Circulation Alerts**: Borrow approval, collection confirmation, return receipts, and due-date reminders.
4. **Role-Based Access Control (RBAC)**: Distinct user interfaces and security boundaries for **Students**, **Librarians**, and **Super Administrators**.

---

## 2. Running on Localhost

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher
- **Git**

### Step 1: Install All Dependencies
Open a terminal in the root directory of `LibNexa`:

```bash
# Installs root monorepo dependencies and all workspace dependencies
npm run install:all
```

### Step 2: Environment Configuration
Create the environment file for the backend API:

```bash
# On Windows PowerShell:
Copy-Item .env.example apps/api/.env

# On macOS / Linux:
cp .env.example apps/api/.env
```

`apps/api/.env` is pre-configured for **zero-dependency local development**:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="libnexa-super-secret-jwt-key-nsuk-2026-production-ready"
JWT_REFRESH_SECRET="libnexa-super-refresh-token-key-nsuk-2026"
APP_BASE_URL="http://localhost:3000"
API_BASE_URL="http://localhost:5000"
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Optional Email / SMTP Config
# When left blank, emails print gracefully to the server console in simulated mode
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="LIBNEXA Library <noreply-library@nsuk.edu.ng>"
```

### Step 3: Database Synchronization & Seeding
Initialize the SQLite database and seed initial administrator accounts and university catalog titles:

```bash
# Synchronizes the Prisma schema with the SQLite database
npm --prefix apps/api run prisma:push

# Populates standard faculties, departments, and seed books
npm run db:seed
```

### Step 4: Launching Development Servers
Run the concurrent dev command from the root directory:

```bash
npm run dev
```

This concurrently launches:
- **Web Portal**: [http://localhost:3000](http://localhost:3000)
- **REST API Server**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

### Default Administrative Accounts

| Account Role | Email Address | Default Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nsuk.edu.ng` | `Admin@NSUK2026!` | Full Institutional Privileges |
| **Library Management** | `admin@libnexa.nsuk.edu.ng` | `Admin@NSUK2026!` | Full Institutional Privileges |

> **Self-Registration for Students**: Students can register instantly using the *"Create Student Account"* button on the login screen with their Matriculation Number and NSUK email.

### Interactive Swagger API Documentation
Open your browser and navigate to:
**[http://localhost:5000/api/docs](http://localhost:5000/api/docs)** to test all REST endpoints interactively.

---

## 3. User Persona Feature Walkthrough

### Student & Faculty Experience

1. **Searching the Catalog**:
   - Use the live search bar to filter by **Title**, **Author**, **ISBN**, or **Category** (Computer Science, Law, Medicine, Agriculture, etc.).
   - Toggle **"Available Only"** to filter out books that are currently checked out.
2. **Borrowing an Available Book**:
   - Click on any book card to view the detailed synopsis, publisher details, physical shelf coordinates, and copy availability.
   - If copies are available, click **"Submit Borrow Request"**.
   - Track your request status in the **"My Requests"** tab (`PENDING` $\rightarrow$ `APPROVED`).
3. **Reserving an Out-of-Stock Book**:
   - If all copies are checked out (`0 Available`), the action button automatically changes to **"Join Waitlist / Reserve"**.
   - Clicking this places you in a FIFO waitlist queue with an assigned queue number (e.g. Queue Position #1).
4. **Subscribing to Availability Alerts**:
   - Click **"Email Me When Available"** in the book detail modal.
   - You will automatically receive a confirmation notification, and as soon as a copy is returned or added to the library, an automated email will be sent to your inbox.
   - View and manage your active subscriptions anytime in **"Reservations & Email Alerts"** under the **"Email Alerts"** tab.
5. **Managing Loans & Renewals**:
   - View due dates in **"Active Loans"**.
   - If you need additional research time, click **"Request Renewal"** before the due date.
6. **Digital Library ID**:
   - Click the ID Card icon in the navigation bar to generate your university digital library pass with an encrypted QR code for desk scanning.

---

### Librarian Circulation Desk & Inventory

1. **Reviewing Borrow Requests**:
   - Open **"Circulation Desk"** $\rightarrow$ **"Pending Requests"**.
   - Review the student's matriculation number, active loan count, and requested title.
   - Click **"Approve Request"** to automatically assign an available shelf copy.
2. **Physical Collection Handshake**:
   - When the student visits the desk, locate their approved request under **"Approved Collections"**.
   - Hand the book to the student and click **"Confirm Collection"**. The loan period officially starts, and a confirmation receipt is emailed to the student.
3. **Processing Book Returns**:
   - Navigate to **"Return Desk"**.
   - Enter or scan the copy accession number (e.g. `NSUK-CS-001`).
   - Select the book condition (`NEW`, `GOOD`, `FAIR`, `DAMAGED`).
   - If the return is overdue, the system calculates the exact daily fine.
   - Click **"Process Return"**:
     - If students are in the reservation queue, the book is held on the reservation shelf, and a collection email is dispatched to the next student in line.
     - If no reservations are pending, the book is returned to general stock, and all subscribed students receive an automated availability email.
4. **Adding New Books to the Catalogue**:
   - Go to **"Inventory & Physical Copies"** $\rightarrow$ Click **"Add New Book Title"**.
   - Enter title, ISBN, authors, category, and synopsis.
   - Notice the purple banner: *"Automated email announcements will be dispatched to students upon registration."*
   - Saving the book automatically notifies all active members via email.
5. **Broadcasting New Arrivals**:
   - On any book card in the inventory view, click **"Broadcast Email"** to re-dispatch a new arrival announcement to all students.

---

### Super Administrator Management

1. **Circulation Policies**:
   - In **"System Settings"**, configure institutional rules:
     - Standard Loan Period (default: `14` days)
     - Daily Overdue Fine Rate (default: `₦100`)
     - Fine Grace Period (default: `2` days)
     - Max Concurrent Loans per Student (default: `3`)
     - Reservation Hold Window (default: `48` hours)
2. **User Administration**:
   - Manage students and promote staff to `LIBRARIAN` or `ADMIN`.
   - Suspend delinquent accounts when necessary.
3. **System Audits & Circulation Analytics**:
   - View immutable audit logs capturing every collection, return, renewal, and catalog update with actor IDs and timestamps.
   - Export CSV reports for university senate reviews.

---

### Automated Email Notification System

#### Email Dispatch Modes
- **Simulated / Dev Mode (Default)**: If SMTP credentials are not set, all notification emails are rendered in clean, structured format directly in your backend console log with full subject, recipient, and preview details.
- **Live SMTP Mode**: When SMTP credentials are provided, Nodemailer connects to your SMTP server and delivers emails to actual student inboxes.

#### Notification Preferences
Every user can customize their delivery channels by clicking the **Bell** icon in the navbar $\rightarrow$ **Settings**:
- **Email Notifications** (Master switch)
- **Push Notifications**
- **Due Date Reminders**
- **New Book Arrivals (Email)**
- **Book Availability Alerts (Email)**

---

## 4. Deployment Guide for Vercel & Production

### Deployment Architecture Overview

Because LibNexa is a monorepo featuring a **React 18 SPA** (`apps/web`) and a **Node.js/Express API** (`apps/api`), the industry standard deployment strategy is:

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│         VERCEL (Frontend)            │     │   RENDER / RAILWAY / VPS (Backend)   │
│                                      │     │                                      │
│  - Hosts apps/web (Vite React SPA)   │────▶│  - Hosts apps/api (Node.js REST API) │
│  - Global CDN & Edge Caching         │     │  - Background cron scheduler         │
│  - SPA rewrite routing in vercel.json│     │  - Nodemailer SMTP worker            │
└──────────────────────────────────────┘     └──────────────────┬───────────────────┘
                                                                │
                                                                ▼
                                             ┌──────────────────────────────────────┐
                                             │     CLOUD DATABASE (MySQL 8.0)       │
                                             │  Aiven / PlanetScale / Supabase /    │
                                             │  Railway MySQL / AWS RDS             │
                                             └──────────────────────────────────────┘
```

---

### Deploying the Web Portal on Vercel

The repository includes pre-configured [`vercel.json`](file:///c:/Users/THE%20DIGITAL%20USTAZ/Documents/dev/LibNexa/vercel.json) files both at the root and in [`apps/web/vercel.json`](file:///c:/Users/THE%20DIGITAL%20USTAZ/Documents/dev/LibNexa/apps/web/vercel.json).

#### Option A: Direct Monorepo Import (Recommended)
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New Project"** and select `Ustaztech/LibNexa`.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Leave as root)
   - **Build Command**: `npm --prefix packages/shared run build && npm --prefix apps/web run build`
   - **Output Directory**: `apps/web/dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://your-libnexa-api.onrender.com/api/v1` *(replace with your deployed API URL)*
5. Click **"Deploy"**.

#### Option B: Root Directory Set to `apps/web`
1. When importing the project in Vercel, click **Edit** beside **Root Directory** and choose `apps/web`.
2. Vercel automatically detects the Vite framework and uses [`apps/web/vercel.json`](file:///c:/Users/THE%20DIGITAL%20USTAZ/Documents/dev/LibNexa/apps/web/vercel.json).
3. Set **Environment Variables**:
   - `VITE_API_URL` = `https://your-libnexa-api.onrender.com/api/v1`
4. Click **"Deploy"**.

---

### Deploying the Backend API

The REST API (`apps/api`) runs as a persistent Node.js service (ideal for Render, Railway, Fly.io, or any Ubuntu VPS).

#### Deploying on Render (Free / Starter Tier)
1. Sign in to [render.com](https://render.com) and click **"New Web Service"**.
2. Connect your GitHub repository `Ustaztech/LibNexa`.
3. Set configuration:
   - **Name**: `libnexa-api`
   - **Environment**: `Node`
   - **Region**: Frankfurt / London (closest to Nigeria)
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm --prefix packages/shared run build && npm --prefix apps/api run build && npm --prefix apps/api run prisma:push
     ```
   - **Start Command**:
     ```bash
     npm --prefix apps/api run start
     ```
4. Set Environment Variables under **Environment**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: `mysql://username:password@host:port/database` *(from your Cloud MySQL provider)*
   - `JWT_SECRET`: *(generate a 64-character random string)*
   - `JWT_REFRESH_SECRET`: *(generate another 64-character random string)*
   - `APP_BASE_URL`: `https://your-libnexa-web.vercel.app`
   - `API_BASE_URL`: `https://your-libnexa-api.onrender.com`
   - `CORS_ALLOWED_ORIGINS`: `https://your-libnexa-web.vercel.app`
5. Click **"Create Web Service"**.

---

### Configuring Live SMTP Email Dispatch

To send real emails to students (Gmail, Microsoft 365, Mailgun, Brevo, or SendGrid), set these variables on your deployed API server:

#### Option 1: Using Gmail (Fastest & Free)
1. Go to your Google Account $\rightarrow$ **Security** $\rightarrow$ Enable **2-Step Verification**.
2. Go to **App Passwords** $\rightarrow$ Generate a password for "Library Mail".
3. Configure your API environment variables:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_library_email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # (16-character App Password)
   MAIL_FROM="NSUK University Library <your_library_email@gmail.com>"
   ```

#### Option 2: Using Brevo (Formerly Sendinblue) / SendGrid
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_brevo_account_login
SMTP_PASSWORD=your_brevo_smtp_key
MAIL_FROM="NSUK Library <noreply@nsuk.edu.ng>"
```

Once configured, verify the connection anytime in the Web Portal by clicking **Notifications** $\rightarrow$ **Settings** $\rightarrow$ **Send Test Email**.

---

### Production Verification Checklist

- [ ] Web Portal deployed to Vercel and accessible via HTTPS.
- [ ] Backend API deployed and responding at `https://<api-domain>/api/v1/health`.
- [ ] `VITE_API_URL` set in Vercel settings pointing to the API.
- [ ] `CORS_ALLOWED_ORIGINS` in API settings includes the Vercel production domain.
- [ ] Database initialized with `prisma db push` and seeded with `db:seed`.
- [ ] SMTP connection tested using the *"Send Test Email"* button in the notification drawer.
- [ ] Sample new book added to confirm automatic email notification delivery.
- [ ] Sample book reserved to verify automated availability alerts.
