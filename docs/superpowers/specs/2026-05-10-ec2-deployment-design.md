# PartyUp Deployment Design

**Date:** 2026-05-10
**Status:** Approved

## Overview

Deploy PartyUp to production using a split architecture: React/Vite frontend on Vercel, ASP.NET Core 8 API + PostgreSQL on an AWS EC2 instance (Ubuntu 22.04), with Cloudflare managing DNS and SSL for the custom domain `kylepep.dev`. Continuous deployment is triggered by merges to the `main` branch via GitHub Actions.

## Architecture

```
GitHub (main branch)
       │
       ├──► GitHub Actions ──► ghcr.io (Docker image registry)
       │                              │
       │                              ▼
       │                    EC2 (Ubuntu 22.04)
       │                    ┌──────────────────────────┐
       │                    │  Nginx (reverse proxy)   │
       │                    │  partyup-api (container) │
       │                    │  partyup-db  (container) │
       │                    └──────────────────────────┘
       │                              ▲
       │                    api.partyup.kylepep.dev
       │                    (Cloudflare → EC2)
       │
       └──► Vercel ──► partyup.kylepep.dev
                       (Cloudflare CNAME → Vercel)
```

### Subdomains

| Subdomain | Target | Purpose |
|---|---|---|
| `partyup.kylepep.dev` | Vercel | React SPA |
| `api.partyup.kylepep.dev` | EC2 | ASP.NET Core API |

### EC2 Services (Docker Compose)

All three services run inside a single `docker-compose.prod.yml` on the EC2:

1. **nginx** — reverse proxy, terminates HTTPS using a Cloudflare Origin Certificate, forwards to the API container
2. **partyup-api** — ASP.NET Core 8 API, image pulled from GitHub Container Registry (`ghcr.io`)
3. **partyup-db** — PostgreSQL 15, data persisted to a named Docker volume

## Continuous Deployment Pipeline

Triggered on every push to `main`.

```
Push to main
     │
     ├─ 1. Run tests (dotnet test)
     │       └─ failure stops the pipeline — nothing deploys
     │
     ├─ 2. Build Docker image for the API
     │       └─ tagged with git SHA + "latest"
     │
     ├─ 3. Push image to GitHub Container Registry (ghcr.io)
     │
     └─ 4. SSH into EC2
             ├─ write /opt/partyup/.env from GitHub Secrets
             ├─ docker compose pull
             ├─ run EF Core migrations
             └─ docker compose up -d
```

Vercel handles frontend deployment automatically on push to `main` — no additional workflow needed. PRs get preview deployment URLs for free.

### GitHub Actions Secrets

| Secret | Purpose |
|---|---|
| `EC2_SSH_KEY` | Private key for SSH into EC2 |
| `EC2_HOST` | EC2 Elastic IP address |
| `JWT_KEY` | Runtime secret injected into API container |
| `RAWG_API_KEY` | Runtime secret injected into API container |
| `DB_PASSWORD` | PostgreSQL password |

Secrets are written to `/opt/partyup/.env` on EC2 at deploy time. `docker-compose.prod.yml` reads from this file via `env_file`.

## Code Changes Required

### 1. Frontend — configurable API base URL

`apps/web/src/api/client.ts` currently hardcodes `http://localhost:5288/api`. Change to:

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5288/api';
```

Set `VITE_API_BASE=https://api.partyup.kylepep.dev/api` in the Vercel project dashboard. Local dev is unchanged.

### 2. Backend — CORS for production domain

`apps/api/Program.cs` currently only allows `localhost:5173`. Read allowed origins from configuration so production can allow `https://partyup.kylepep.dev` while local dev allows `http://localhost:5173`.

### 3. New files

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | Multi-stage build: SDK image to compile, runtime image to run |
| `docker-compose.prod.yml` | Defines nginx + partyup-api + partyup-db for production |
| `nginx/nginx.conf` | Reverse proxy config, SSL termination using Cloudflare Origin Certificate |
| `.github/workflows/deploy.yml` | Full CI/CD pipeline |

## Cloudflare & Vercel Setup

### Vercel

1. Connect GitHub repo to a new Vercel project; set root directory to `apps/web`
2. Add env var `VITE_API_BASE=https://api.partyup.kylepep.dev/api` in Vercel dashboard
3. Add `partyup.kylepep.dev` as a custom domain; Vercel provides a CNAME target
4. In Cloudflare DNS: `CNAME partyup → <vercel-target>`, proxy **enabled** (orange cloud)

### Cloudflare → EC2

1. Generate a **Cloudflare Origin Certificate** for `api.partyup.kylepep.dev` (15-year validity) in the Cloudflare dashboard
2. Install the certificate and key on EC2 at `/etc/ssl/partyup/`
3. In Cloudflare DNS: `A api.partyup → <Elastic IP>`, proxy **enabled** (orange cloud)
4. Set SSL/TLS mode to **Full (strict)** in Cloudflare

### Elastic IP

Attach an AWS Elastic IP to the EC2 instance. Without one, the public IP changes on every reboot, breaking the DNS `A` record. Elastic IPs are free while the instance is running.

## One-Time EC2 Setup (Manual)

Performed once via SSH before first deploy:

1. Install Docker and Docker Compose plugin
2. Create `/opt/partyup/` directory
3. Copy `docker-compose.prod.yml` and `nginx/nginx.conf` to `/opt/partyup/`
4. Install Cloudflare Origin Certificate to `/etc/ssl/partyup/`
5. Open ports 80 and 443 in the EC2 security group (inbound rules)
6. Attach Elastic IP in AWS console
7. Create a deploy user or configure SSH access for GitHub Actions

## Known Constraints

- **EC2 RAM:** t2.micro has 1 GB. Expected usage at idle: API ~150 MB, PostgreSQL ~80 MB, Nginx ~10 MB, Docker daemon ~50 MB. Leaves ~700 MB headroom — sufficient for low traffic but worth monitoring.
- **Free tier expiry:** EC2 free tier expires in a few months. Plan to either upgrade to a paid tier or migrate hosting before then.
- **Database backups:** Not covered in this design. For a learning project this is acceptable; add a pg_dump cron job before treating this as production data.
