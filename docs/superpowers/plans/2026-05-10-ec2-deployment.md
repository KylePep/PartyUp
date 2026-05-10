# EC2 Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy PartyUp to production with the React SPA on Vercel (`partyup.kylepep.dev`) and the ASP.NET Core API + PostgreSQL on EC2 (`api.partyup.kylepep.dev`), with merges to `main` triggering automatic redeployment via GitHub Actions.

**Architecture:** Frontend static build served from Vercel with `VITE_API_BASE` pointing at the EC2 subdomain. On EC2, three Docker containers run under Docker Compose: Nginx (SSL termination via Cloudflare Origin Certificate), the .NET API (image from GHCR), and PostgreSQL (data in named volume). GitHub Actions builds and pushes the API image then SSHs into EC2 to pull and restart.

**Tech Stack:** ASP.NET Core 8, React + Vite + TypeScript, PostgreSQL 15, Docker Compose, Nginx, GitHub Actions, Vercel, Cloudflare (DNS + SSL proxy), AWS EC2 Ubuntu 22.04.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `apps/web/src/api/client.ts` | Read API base URL from `VITE_API_BASE` env var |
| Modify | `apps/api/Program.cs` | CORS from config; run DB migrations on startup |
| Modify | `apps/api/appsettings.json` | Add `AllowedOrigins` for local dev |
| Create | `apps/api/appsettings.Production.json` | `AllowedOrigins` for production domain |
| Create | `apps/tests/PartyUp.Api.Tests/Features/Config/CorsTests.cs` | Verify CORS reads origins from config |
| Create | `apps/api/Dockerfile` | Multi-stage build: SDK → runtime image |
| Create | `nginx/nginx.conf` | Reverse proxy to API container with SSL |
| Create | `docker-compose.prod.yml` | Three-service production stack |
| Create | `.env.example` | Template for EC2 secrets file |
| Create | `.github/workflows/deploy.yml` | Test → build → push → SSH deploy pipeline |

---

## Task 1: Make Frontend API Base URL Configurable

**Files:**
- Modify: `apps/web/src/api/client.ts:1`

- [ ] **Step 1: Update client.ts**

  Replace line 1 of `apps/web/src/api/client.ts`:

  ```ts
  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5288/api";
  ```

  The rest of the file is unchanged. The fallback keeps local dev working without any `.env` file.

- [ ] **Step 2: Verify the build passes**

  ```
  npm run build --prefix apps/web
  ```

  Expected: build completes with no TypeScript or Vite errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/api/client.ts
  git commit -m "feat: read API base URL from VITE_API_BASE env var"
  ```

---

## Task 2: Make CORS Origins Configurable

**Files:**
- Modify: `apps/api/Program.cs:93-103` (the `#region CORS` block)
- Modify: `apps/api/appsettings.json`
- Create: `apps/api/appsettings.Production.json`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Config/CorsTests.cs`

- [ ] **Step 1: Write the failing CORS test**

  Create `apps/tests/PartyUp.Api.Tests/Features/Config/CorsTests.cs`:

  ```csharp
  using PartyUp.Api.Tests.Factories;
  using Xunit;

  namespace PartyUp.Api.Tests.Features.Config;

  [Collection("Database")]
  public class CorsTests : Infrastructure.TestBase
  {
      public CorsTests(ApiFactory factory) : base(factory) { }

      [Fact]
      public async Task AllowedOrigin_ReturnsCorsHeader()
      {
          var request = new HttpRequestMessage(HttpMethod.Options, "/api/health");
          request.Headers.Add("Origin", "http://localhost:5173");
          request.Headers.Add("Access-Control-Request-Method", "GET");

          var response = await Client.SendAsync(request);

          Assert.True(
              response.Headers.Contains("Access-Control-Allow-Origin"),
              "Expected Access-Control-Allow-Origin header to be present");
          Assert.Equal(
              "http://localhost:5173",
              response.Headers.GetValues("Access-Control-Allow-Origin").First());
      }

      [Fact]
      public async Task UnknownOrigin_DoesNotReturnCorsHeader()
      {
          var request = new HttpRequestMessage(HttpMethod.Options, "/api/health");
          request.Headers.Add("Origin", "https://evil.example.com");
          request.Headers.Add("Access-Control-Request-Method", "GET");

          var response = await Client.SendAsync(request);

          Assert.False(
              response.Headers.Contains("Access-Control-Allow-Origin"),
              "Expected no Access-Control-Allow-Origin header for unknown origin");
      }
  }
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```
  dotnet test --filter "FullyQualifiedName~CorsTests"
  ```

  Expected: FAIL — the current CORS config hardcodes `localhost:5173` without reading from config, but `AllowedOrigin_ReturnsCorsHeader` may pass incidentally. The important failure is that you've confirmed the test runs and the pattern is correct before changing code.

- [ ] **Step 3: Add `AllowedOrigins` to `apps/api/appsettings.json`**

  Replace the entire file contents:

  ```json
  {
    "Logging": {
      "LogLevel": {
        "Default": "Information",
        "Microsoft.AspNetCore": "Warning"
      }
    },
    "Jwt": {},
    "ConnectionStrings": {},
    "Rawg": {},
    "AllowedHosts": "*",
    "AllowedOrigins": [ "http://localhost:5173" ]
  }
  ```

- [ ] **Step 4: Create `apps/api/appsettings.Production.json`**

  ```json
  {
    "AllowedOrigins": [ "https://partyup.kylepep.dev" ]
  }
  ```

- [ ] **Step 5: Update the CORS block in `apps/api/Program.cs`**

  Replace lines 93–102 (the `#region CORS` block):

  ```csharp
  #region CORS

  builder.Services.AddCors(options =>
  {
      options.AddPolicy("AllowFrontend",
          policy =>
          {
              var origins = builder.Configuration
                  .GetSection("AllowedOrigins")
                  .Get<string[]>() ?? [];
              policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
          });
  });

  #endregion
  ```

- [ ] **Step 6: Run the CORS tests to confirm they pass**

  ```
  dotnet test --filter "FullyQualifiedName~CorsTests"
  ```

  Expected: both tests PASS.

- [ ] **Step 7: Run the full test suite to confirm nothing regressed**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: all tests PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/Program.cs apps/api/appsettings.json apps/api/appsettings.Production.json apps/tests/PartyUp.Api.Tests/Features/Config/CorsTests.cs
  git commit -m "feat: read CORS allowed origins from configuration"
  ```

---

## Task 3: Run EF Migrations on Startup

This lets the API create and migrate the database automatically on first boot in production, and makes the test environment self-contained (no need to pre-migrate the test DB manually).

**Files:**
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Add migration call to `Program.cs`**

  After line 108 (`var app = builder.Build();`), insert:

  ```csharp
  using (var scope = app.Services.CreateScope())
  {
      var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
      db.Database.Migrate();
  }
  ```

  The full block should sit between `var app = builder.Build();` and `#region Middleware`.

- [ ] **Step 2: Run the full test suite to confirm nothing regressed**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: all tests PASS. The `ApiFactory` overrides the connection string to `partyup_test`, so `Migrate()` runs against the test DB — this is correct and means the test DB schema is always up-to-date automatically.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/api/Program.cs
  git commit -m "feat: run EF migrations on startup"
  ```

---

## Task 4: Create the API Dockerfile

**Files:**
- Create: `apps/api/Dockerfile`

The Dockerfile lives next to the `.csproj` but sets its build context to the repo root (required so the `COPY apps/api/` path resolves). The GitHub Actions workflow will pass `context: .` when building.

- [ ] **Step 1: Create `apps/api/Dockerfile`**

  ```dockerfile
  FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
  WORKDIR /src

  COPY apps/api/PartyUp.Api.csproj apps/api/
  RUN dotnet restore apps/api/PartyUp.Api.csproj

  COPY apps/api/ apps/api/
  RUN dotnet publish apps/api/PartyUp.Api.csproj \
      -c Release \
      -o /app/publish \
      --no-restore

  FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
  WORKDIR /app
  COPY --from=build /app/publish .
  EXPOSE 8080
  ENTRYPOINT ["dotnet", "PartyUp.Api.dll"]
  ```

- [ ] **Step 2: Verify the image builds**

  Run from the repo root:

  ```
  docker build -f apps/api/Dockerfile -t partyup-api:local .
  ```

  Expected: build completes and image tagged `partyup-api:local` appears in `docker images`.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/api/Dockerfile
  git commit -m "feat: add multi-stage Dockerfile for API"
  ```

---

## Task 5: Create Nginx Config

**Files:**
- Create: `nginx/nginx.conf`

Nginx listens on 443 with the Cloudflare Origin Certificate and proxies requests to the `partyup-api` container on port 8080 (the .NET 8 default). Port 80 redirects to HTTPS.

- [ ] **Step 1: Create `nginx/nginx.conf`**

  ```nginx
  server {
      listen 80;
      server_name api.partyup.kylepep.dev;
      return 301 https://$host$request_uri;
  }

  server {
      listen 443 ssl;
      server_name api.partyup.kylepep.dev;

      ssl_certificate /etc/ssl/partyup/origin.crt;
      ssl_certificate_key /etc/ssl/partyup/origin.key;

      location / {
          proxy_pass http://partyup-api:8080;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add nginx/nginx.conf
  git commit -m "feat: add nginx reverse proxy config"
  ```

---

## Task 6: Create Production Docker Compose and Env Template

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.example`

- [ ] **Step 1: Create `docker-compose.prod.yml`**

  ```yaml
  version: "3.9"

  services:
    nginx:
      image: nginx:alpine
      container_name: partyup-nginx
      restart: always
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
        - /etc/ssl/partyup:/etc/ssl/partyup:ro
      depends_on:
        - partyup-api

    partyup-api:
      image: ghcr.io/kylepep/partyup:latest
      container_name: partyup-api
      restart: always
      env_file:
        - .env
      depends_on:
        - partyup-db

    partyup-db:
      image: postgres:15
      container_name: partyup-db
      restart: always
      environment:
        POSTGRES_USER: partyup
        POSTGRES_PASSWORD: ${DB_PASSWORD}
        POSTGRES_DB: partyup
      volumes:
        - partyup-data:/var/lib/postgresql/data

  volumes:
    partyup-data:
  ```

- [ ] **Step 2: Create `.env.example`**

  ```
  DB_PASSWORD=REPLACE_ME
  ConnectionStrings__DefaultConnection=Host=partyup-db;Database=partyup;Username=partyup;Password=REPLACE_ME
  Jwt__Key=REPLACE_ME
  Rawg__ApiKey=REPLACE_ME
  ASPNETCORE_ENVIRONMENT=Production
  ```

  > Note: `ConnectionStrings__DefaultConnection` must use the same password as `DB_PASSWORD`. The double-underscore `__` is the .NET environment variable separator for nested config keys (equivalent to `"ConnectionStrings": { "DefaultConnection": "..." }` in JSON).

- [ ] **Step 3: Commit**

  ```bash
  git add docker-compose.prod.yml .env.example
  git commit -m "feat: add production Docker Compose and env template"
  ```

---

## Task 7: Create GitHub Actions CI/CD Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

The workflow has two jobs: `test` (runs the integration test suite against a real PostgreSQL service container) and `deploy` (builds + pushes the Docker image to GHCR, then SSHs into EC2 to pull and restart). `deploy` only runs if `test` passes.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

  ```yaml
  name: Deploy

  on:
    push:
      branches: [main]

  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:15
          env:
            POSTGRES_USER: partyup
            POSTGRES_PASSWORD: partyup
            POSTGRES_DB: partyup_test
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-dotnet@v4
          with:
            dotnet-version: "8.0.x"
        - name: Restore
          run: dotnet restore
        - name: Test
          run: dotnet test apps/tests/PartyUp.Api.Tests --no-restore

    deploy:
      needs: test
      runs-on: ubuntu-latest
      permissions:
        contents: read
        packages: write
      steps:
        - uses: actions/checkout@v4

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Log in to GHCR
          uses: docker/login-action@v3
          with:
            registry: ghcr.io
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}

        - name: Build and push API image
          uses: docker/build-push-action@v5
          with:
            context: .
            file: apps/api/Dockerfile
            push: true
            tags: |
              ghcr.io/kylepep/partyup:latest
              ghcr.io/kylepep/partyup:${{ github.sha }}
            cache-from: type=gha
            cache-to: type=gha,mode=max

        - name: Deploy to EC2
          uses: appleboy/ssh-action@v1
          env:
            DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
            JWT_KEY: ${{ secrets.JWT_KEY }}
            RAWG_API_KEY: ${{ secrets.RAWG_API_KEY }}
          with:
            host: ${{ secrets.EC2_HOST }}
            username: ubuntu
            key: ${{ secrets.EC2_SSH_KEY }}
            envs: DB_PASSWORD,JWT_KEY,RAWG_API_KEY
            script: |
              cd /opt/partyup
              {
                echo "DB_PASSWORD=$DB_PASSWORD"
                echo "ConnectionStrings__DefaultConnection=Host=partyup-db;Database=partyup;Username=partyup;Password=$DB_PASSWORD"
                echo "Jwt__Key=$JWT_KEY"
                echo "Rawg__ApiKey=$RAWG_API_KEY"
                echo "ASPNETCORE_ENVIRONMENT=Production"
              } > .env
              docker compose -f docker-compose.prod.yml pull
              docker compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "feat: add GitHub Actions CI/CD workflow"
  ```

---

## Task 8: One-Time EC2 Setup (Manual Steps)

These steps are performed once via SSH. They do not need to be repeated on subsequent deploys.

**Prerequisites:** You have the EC2 `.pem` key file and the EC2 public IP (before attaching Elastic IP, use the current IP).

- [ ] **Step 1: Attach an Elastic IP in AWS Console**

  In the AWS Console → EC2 → Elastic IPs:
  1. Click **Allocate Elastic IP address** → Allocate
  2. Select the new IP → **Associate Elastic IP address**
  3. Choose your instance → Associate
  4. Record this IP — it will not change on reboots

- [ ] **Step 2: Open ports in the EC2 Security Group**

  In the AWS Console → EC2 → Security Groups → select your instance's group → **Inbound rules** → **Edit inbound rules**:

  Add these rules if not already present:
  - Type: SSH, Port: 22, Source: My IP (or 0.0.0.0/0 for anywhere)
  - Type: HTTP, Port: 80, Source: 0.0.0.0/0
  - Type: HTTPS, Port: 443, Source: 0.0.0.0/0

- [ ] **Step 3: SSH into EC2 and install Docker**

  ```bash
  ssh -i /path/to/your-key.pem ubuntu@<ELASTIC_IP>
  ```

  Then run:

  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt update
  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker ubuntu
  ```

  Log out and back in so the group change takes effect:

  ```bash
  exit
  ssh -i /path/to/your-key.pem ubuntu@<ELASTIC_IP>
  ```

  Verify:

  ```bash
  docker run --rm hello-world
  ```

  Expected: "Hello from Docker!" message.

- [ ] **Step 4: Create the app directory**

  ```bash
  mkdir -p /opt/partyup/nginx
  sudo mkdir -p /etc/ssl/partyup
  sudo chown ubuntu:ubuntu /etc/ssl/partyup
  ```

- [ ] **Step 5: Copy `docker-compose.prod.yml` and `nginx/nginx.conf` to EC2**

  Run from your local machine (not inside the SSH session):

  ```bash
  scp -i /path/to/your-key.pem docker-compose.prod.yml ubuntu@<ELASTIC_IP>:/opt/partyup/
  scp -i /path/to/your-key.pem nginx/nginx.conf ubuntu@<ELASTIC_IP>:/opt/partyup/nginx/
  ```

- [ ] **Step 6: Generate and install the Cloudflare Origin Certificate**

  In the Cloudflare dashboard:
  1. Select your `kylepep.dev` zone → **SSL/TLS** → **Origin Server**
  2. Click **Create Certificate**
  3. Hostnames: `api.partyup.kylepep.dev` (add manually if not listed)
  4. Validity: 15 years
  5. Click **Create**

  Copy the **Origin Certificate** content and the **Private Key** content. Back on EC2:

  ```bash
  nano /etc/ssl/partyup/origin.crt   # paste certificate, Ctrl+X to save
  nano /etc/ssl/partyup/origin.key   # paste private key, Ctrl+X to save
  chmod 600 /etc/ssl/partyup/origin.key
  ```

- [ ] **Step 7: Configure the SSH key for GitHub Actions**

  GitHub Actions will SSH into your EC2. It needs a key pair. Generate one on your local machine (not on the EC2):

  ```bash
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/partyup_deploy
  ```

  This creates `partyup_deploy` (private) and `partyup_deploy.pub` (public). Add the public key to the EC2:

  ```bash
  # On EC2:
  echo "<contents of partyup_deploy.pub>" >> ~/.ssh/authorized_keys
  ```

  Keep the private key (`partyup_deploy`) — you'll add it as a GitHub Secret in Task 10.

- [ ] **Step 8: Add GitHub Actions user to GHCR allowlist (make package public)**

  After the first successful deploy runs and the `partyup` package appears in GHCR, the EC2 needs to be able to pull it. The simplest approach for a learning project: in GitHub, go to **Packages** → `partyup` → **Package settings** → change visibility to **Public**.

  If you prefer private, create a Personal Access Token (PAT) at GitHub → Settings → Developer settings → Personal access tokens → Fine-grained, with `read:packages` scope. Store it as `GHCR_PAT` in GitHub Secrets, and add this step to the deploy job before the EC2 SSH step:

  ```yaml
  - name: Authenticate EC2 with GHCR
    uses: appleboy/ssh-action@v1
    with:
      host: ${{ secrets.EC2_HOST }}
      username: ubuntu
      key: ${{ secrets.EC2_SSH_KEY }}
      script: |
        echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u kylepep --password-stdin
  ```

---

## Task 9: Add GitHub Secrets

All secrets are stored in GitHub → your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

- [ ] **Step 1: Add all required secrets**

  | Name | Value |
  |---|---|
  | `EC2_HOST` | The Elastic IP address from Task 8 Step 1 |
  | `EC2_SSH_KEY` | The contents of `~/.ssh/partyup_deploy` (private key, the full PEM text) |
  | `DB_PASSWORD` | A strong random password (e.g. output of `openssl rand -base64 32`) |
  | `JWT_KEY` | A strong random string (e.g. output of `openssl rand -base64 64`) |
  | `RAWG_API_KEY` | Your RAWG.io API key from `appsettings.Development.json` |

---

## Task 10: Cloudflare DNS and Vercel Setup (Manual Steps)

- [ ] **Step 1: Set up Vercel project**

  1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
  2. Set **Root Directory** to `apps/web`
  3. Framework preset: Vite
  4. Add Environment Variable: `VITE_API_BASE` = `https://api.partyup.kylepep.dev/api`
  5. Deploy — Vercel gives you a `.vercel.app` URL

- [ ] **Step 2: Add custom domain in Vercel**

  In Vercel project → **Settings** → **Domains** → add `partyup.kylepep.dev`. Vercel will show you a CNAME target (e.g. `cname.vercel-dns.com`).

- [ ] **Step 3: Add Cloudflare DNS records**

  In the Cloudflare dashboard for `kylepep.dev` → **DNS** → **Records**:

  | Type | Name | Content | Proxy |
  |---|---|---|---|
  | CNAME | `partyup` | `cname.vercel-dns.com` (from Vercel) | Proxied (orange) |
  | A | `api.partyup` | `<your Elastic IP>` | Proxied (orange) |

- [ ] **Step 4: Set Cloudflare SSL mode to Full (strict)**

  In Cloudflare → **SSL/TLS** → **Overview** → select **Full (strict)**.

- [ ] **Step 5: Trigger the first deploy**

  Push or merge anything to `main`. Watch the Actions tab in GitHub — the `test` job runs first, then `deploy`. After it completes, visit `https://partyup.kylepep.dev` — the frontend should load and calls to the API should work.

  If the containers don't start, SSH into EC2 and check logs:

  ```bash
  docker compose -f /opt/partyup/docker-compose.prod.yml logs --tail=50
  ```

---

## Self-Check After First Successful Deploy

- [ ] `https://partyup.kylepep.dev` loads the React app
- [ ] Registering a new user succeeds (API call reaches EC2)
- [ ] On next merge to `main`, the Actions workflow completes and the site updates
- [ ] `docker ps` on EC2 shows three running containers: `partyup-nginx`, `partyup-api`, `partyup-db`
