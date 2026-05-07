# LAMP/Debian Deployment Guide

This project is designed to run on a traditional Debian + Apache + PostgreSQL + Node.js environment.

## Debian 13.4 packages

```bash
sudo apt update
sudo apt install -y nodejs npm git build-essential postgresql postgresql-client apache2
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl restart apache2
```

## Build

```bash
npm ci
npm run build
```

Deploy static assets:

```bash
sudo mkdir -p /var/www/auctionation/admin /var/www/auctionation/embed
sudo cp -R apps/admin/dist/* /var/www/auctionation/admin/
sudo cp -R apps/embed/dist/* /var/www/auctionation/embed/
```

The scaffolded Node services currently compile TypeScript to `dist/` with local workspace package code included as needed. Re-run `npm run build` after every deployment pull before restarting systemd services.

## API environment

Create `/etc/auctionation/api.env`:

```ini
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=3000
DATABASE_URL=postgresql://auctionation:CHANGE_ME@localhost:5432/auctionation
PUBLIC_APP_URL=https://auctions.example.com
PUBLIC_EMBED_URL=https://auctions.example.com/embed
SMTP_HOST=smtp.graphmail.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
SMTP_FROM=Auctionation <no-reply@example.com>
```

## systemd

Copy service templates from `infra/systemd` to `/etc/systemd/system`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now auctionation-api auctionation-notifications
```

## Apache

Copy `infra/apache/auctionation.conf` into `/etc/apache2/sites-available/`, adjust `ServerName`, then:

```bash
sudo a2ensite auctionation
sudo apachectl configtest
sudo systemctl reload apache2
```