# LIBNEXA: University Library Catalog & Borrowing Management System

[![NSUK Library Pilot](https://img.shields.io/badge/NSUK-University_Library_Keffi-082B60.svg)](https://nsuk.edu.ng)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)

**LIBNEXA** is an enterprise-grade, full-stack library catalog and physical book circulation management system engineered for **Nasarawa State University, Keffi (NSUK)**. It bridges the physical library floor with digital convenience, enabling students and faculty to discover books, request loans, track waitlists, renew borrowing periods, and generate digital membership passes, while equipping librarians and administrators with tools for inventory management, circulation desks, return audits, and policy enforcement.

---

## 🏛 System Architecture

The project is structured as an integrated monorepo utilizing npm workspaces:

```
LibNexa/
├── apps/
│   ├── api/             # RESTful Backend API (Express, TypeScript, Prisma ORM, SQLite/MySQL)
│   ├── web/             # Responsive Single-Page Application (React 18, Vite, Tailwind CSS)
│   └── mobile/          # Cross-Platform Student App (React Native, Expo SDK, Digital ID QR)
├── packages/
│   └── shared/          # Shared domain types, NSUK academic structure, and circulation algorithms
├── database/
│   ├── init.mysql.sql   # Production DDL and indexing schema for MySQL 8.0+
│   └── schema.mysql.prisma # Production MySQL schema mirroring
├── scripts/
│   └── generate-qr.js   # Expo QR development harness
└── tests/               # End-to-end and integration verification suites
```

---

## 🚀 Key Modules & Capabilities

### 1. Student Portal (`apps/web` & `apps/mobile`)
- **Interactive Catalogue**: Search by title, author, ISBN, category, or shelf location.
- **Dynamic Copy Availability**: Real-time breakdown of total physical copies, currently available copies on shelf, copies on loan, and reserved copies.
- **Self-Service Borrowing**: Instant digital loan requests with librarian approval tracking.
- **Loan Renewals**: One-click loan extension requests with automated policy checks (reservation conflict checks, max renewals enforcement).
- **Waitlist Reservations**: Automated FIFO reservation queue ordering for books with zero available copies.
- **Digital Library Pass**: QR code-encoded membership identity for quick physical check-out at circulation desks.

### 2. Librarian Circulation Desk (`apps/web`)
- **Request Dispatch**: Review, approve, or reject student borrowing requests with assigned physical copy tracking.
- **Physical Collection Handshake**: Confirm physical book handover to student, starting the official loan period.
- **Check-In Return Processing**: Scan accession barcodes upon return, record condition assessments (`NEW`, `GOOD`, `FAIR`, `DAMAGED`), and assess overdue fines.
- **Inventory & Accession Management**: Add and manage individual physical copies, track accession numbers, barcodes, and shelf coordinates.

### 3. Super Administrator Dashboard (`apps/web`)
- **System Circulation Policies**: Real-time configuration of loan duration (days), daily overdue fine rate (NGN), student borrowing limits, max renewals, and reservation hold periods.
- **Staff & User Access Control**: Manage student registrations, librarian assignments, and account statuses (`ACTIVE`, `SUSPENDED`).
- **Comprehensive Audit Trail**: Immutable logging of all physical collections, returns, renewals, policy changes, and access events.
- **Analytics & Reporting**: Live visualizations of monthly loan trends, popular book categories, and active circulation rates.

### 4. Background Automation Worker (`apps/api`)
- Automated cron schedule detecting overdue loans.
- Dynamic fine accumulation with grace period enforcement.
- Outbox notification triggers for loan reminders, approvals, and waitlist allocations.

---

## ⚡ Quick Start & Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher

### 1. Install Dependencies
```bash
# Install root monorepo dependencies and initialize all workspaces
npm run install:all
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example apps/api/.env
```
*By default, zero-dependency SQLite (`file:./dev.db`) is pre-configured for instant local development without requiring external database servers.*

### 3. Initialize & Seed Database
```bash
# Generate Prisma Client and seed administrative and catalog records
npm run db:seed
```

### 4. Start Development Servers
```bash
# Starts both the API server (Port 5000) and Web portal (Port 3000) concurrently:
npm run dev
```

- **Web Portal**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Interactive Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

### 5. (Optional) Start Mobile Development Server
```bash
npm run dev:mobile
```

---

## 🔑 System Administration & Authentication

| Role | Official Email | Default Credential | Access Level |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nsuk.edu.ng` | `Admin@NSUK2026!` | Full Institutional Privileges |
| **Library Management Alias** | `admin@libnexa.nsuk.edu.ng` | `Admin@NSUK2026!` | Full Institutional Privileges |

> **Production Security Note:**
> All demo accounts, mock transactions, and sample student logins have been removed for production readiness.
> - **Students**: Self-register through the Web Portal or Mobile Application with their matriculation number and campus email.
> - **Librarians**: Provisioned directly by the System Administrator via the Admin Portal (`/admin/librarians`).

---

## 🧪 Automated Verification Suite

LibNexa features a test harness covering critical business logic, security constraints, and data integrity:

```bash
npm test
```

### Verified Test Cases:
1. **Student Registration & Validation**: Email verification, matriculation number validation, and credential hashing.
2. **Catalogue Search & Availability Calculation**: Real-time aggregation of physical copy statuses.
3. **End-to-End Borrowing Workflow**: Digital request $\rightarrow$ Librarian approval $\rightarrow$ Physical collection $\rightarrow$ Active loan $\rightarrow$ Return processing.
4. **Book Reservation & Queue Ordering**: FIFO waitlist placement and reservation queue positioning.
5. **Analytics & Reporting Integrity**: Accurate calculation of inventory, active loans, and category distributions.
6. **Super Admin Policies & Settings**: Dynamic parameter persistence and borrowing limit enforcement.
7. **Loan Renewal Request & Review**: Student extension request, reservation conflict checking, librarian approval, and due date recalculation.
8. **Physical Copy Inventory Lifecycle**: Accessioning, barcode collision prevention, and condition management.
9. **Security & Authentication Constraints**: Duplicate matriculation prevention, suspended account rejection, and role-based route guard integrity.
10. **Automated Email Notifications**: Automatic email dispatch on new book additions, waitlist availability alerts, and copy restock notifications.

---

## 🌐 Deployment & Detailed Documentation

For full step-by-step instructions on deploying the Web Portal to **Vercel**, deploying the Backend API, configuring live SMTP, and feature walkthroughs for all personas, see:

📖 **[Complete Deployment & Feature Walkthrough Guide](file:///docs/DEPLOYMENT_AND_USAGE_GUIDE.md)**

### Vercel Quick Deploy
- **Web App Directory**: `apps/web` (or root using pre-configured [`vercel.json`](file:///vercel.json))
- **Framework**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (or `apps/web/dist`)
- **Environment Variable**: `VITE_API_URL=https://your-api-domain.com/api/v1`

---

## 📦 Production Build

```bash
# Builds @libnexa/shared, libnexa-api, and libnexa-web production bundles
npm run build
```

---

## 📄 License & Attribution
Developed for **Nasarawa State University, Keffi (NSUK)**. Distributed under the MIT License.
