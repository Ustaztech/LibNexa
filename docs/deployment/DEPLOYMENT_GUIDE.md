# LIBNEXA Production Deployment Guide

**Target Audience**: DevOps Engineers, System Administrators, and NSUK ICT Infrastructure Team

---

## 1. Production Architecture Overview

In production, LIBNEXA is deployed using:
- **Web Portal**: Render static site served over HTTPS and a global CDN.
- **RESTful API**: Node.js service on Render.
- **Database**: Render PostgreSQL for the hosted Blueprint, or a dedicated managed database for production.
- **Reverse Proxy**: Nginx or Caddy terminating TLS (HTTPS) with Let's Encrypt certificates.

---

## 2. MySQL Database Setup

### Step A: Provision MySQL Database
Log in to your MySQL 8.0 server:
```bash
mysql -u root -p
```

Create the dedicated database and user:
```sql
CREATE DATABASE `libnexa_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'libnexa_user'@'localhost' IDENTIFIED BY 'StrongProductionPassword2026!';
GRANT ALL PRIVILEGES ON `libnexa_db`.* TO 'libnexa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step B: Execute Schema Migration
Import the production DDL schema:
```bash
mysql -u libnexa_user -p libnexa_db < database/init.mysql.sql
```

---

## 3. Environment Configuration

Create `/etc/libnexa/.env` or `.env` inside `apps/api/`:

```ini
PORT=5000
NODE_ENV=production

# MySQL Production Connection String
DATABASE_URL="mysql://libnexa_user:StrongProductionPassword2026!@localhost:3306/libnexa_db"

# JWT Cryptographic Secrets (Minimum 32 random characters)
JWT_SECRET="nsuk-libnexa-prod-jwt-super-secret-key-2026-very-secure"
JWT_REFRESH_SECRET="nsuk-libnexa-prod-refresh-jwt-super-secret-key-2026-very-secure"

# Allowed CORS Origins
APP_BASE_URL="https://library.nsuk.edu.ng"
API_BASE_URL="https://library-api.nsuk.edu.ng"
CORS_ALLOWED_ORIGINS="https://library.nsuk.edu.ng"

# SMTP Transactional Email
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@nsuk.edu.ng"
SMTP_PASSWORD="[SMTP_SECRET]"
MAIL_FROM="NSUK University Library <noreply-library@nsuk.edu.ng>"
```

---

## 4. Build & Process Management

### Step A: Build Monorepo
```bash
# Clean install and build all artifacts
npm run install:all
npm run build
```

### Step B: Run Database Seeds (Bootstrap Initial Admin & Data)
```bash
npm run db:seed
```

### Step C: Process Management via PM2
Install PM2 globally if not already installed:
```bash
npm install -g pm2
```

Start the API service:
```bash
pm2 start apps/api/dist/index.js --name "libnexa-api" -i max
pm2 save
pm2 startup
```

## 5. Render Deployment (Temporary Free Tier)

The repository includes a Render Blueprint in `render.yaml`. Sync it to create
the web portal, API, and PostgreSQL database. The website is published at
`https://libnexa-nsuk-web.onrender.com`; the API is at
`https://libnexa-nsuk-api.onrender.com`. The API derives a PostgreSQL Prisma
schema from the SQLite development schema during deployment; local development
remains on SQLite.

The API and database use Render's free tier. The API can sleep when idle, and
the free PostgreSQL database expires after 30 days. The static website does not
sleep. This setup is for testing, not production; upgrade the API/database and
configure database backups before relying on it for library records.

After deployment, verify the website and
`https://libnexa-nsuk-api.onrender.com/api/v1/health`. The web and Android apps
default to the current Render API at
`https://libnexa-nsuk-api.onrender.com/api/v1`.

The database schema and default settings/categories are initialized on API
startup. If no administrator exists, the safe bootstrap creates
`admin@nsuk.edu.ng` using the generated `INITIAL_ADMIN_PASSWORD` in the API
service's Render environment. Retrieve that secret from the Render dashboard;
it is never logged or reset by subsequent deployments. Existing users,
transactions, settings, and inventory are preserved. No sample books or copies
are inserted: add real library inventory from the administrator portal.

---

## 6. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/libnexa`:

```nginx
# Web Frontend
server {
    listen 80;
    server_name library.nsuk.edu.ng;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name library.nsuk.edu.ng;

    ssl_certificate /etc/letsencrypt/live/library.nsuk.edu.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/library.nsuk.edu.ng/privkey.pem;

    root /var/www/libnexa/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}

# Backend API
server {
    listen 443 ssl http2;
    server_name library-api.nsuk.edu.ng;

    ssl_certificate /etc/letsencrypt/live/library-api.nsuk.edu.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/library-api.nsuk.edu.ng/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable configuration and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/libnexa /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```
