# ALARM Frontend — Deployment Guide (Hostinger VPS)

Deploys the Next.js frontend to **https://bdalarm.org** on the Hostinger VPS.

| Item | Value |
|---|---|
| Server user | `backend_dev` |
| Project folder | `/home/backend_dev/projects/alarm` |
| App folder | `/home/backend_dev/projects/alarm/frontend` |
| App port | **3100** (port 3000 is used by another project) |
| Process manager | **systemd** (service name `alarm-frontend`) |
| Web server | Nginx (reverse proxy) + Let's Encrypt HTTPS |
| Domain | `bdalarm.org`, `www.bdalarm.org` |

> Nothing in this guide changes or removes the other project's setup. The Nginx file below only answers for `bdalarm.org`.

---

## 0. Before you start

**DNS** — in Hostinger's DNS panel for `bdalarm.org` there must be two A records pointing to the VPS IP:

| Type | Name | Points to |
|---|---|---|
| A | `@` | VPS IP |
| A | `www` | VPS IP |

Check from any computer: `ping bdalarm.org` should show the VPS IP. (DNS changes can take up to an hour.)

**Connect to the server:**

```bash
ssh backend_dev@200.97.162.198
```

---

## 1. Check the server

```bash
node -v                 # must be v20.9 or newer (v22 recommended)
npm -v
nginx -v
sudo ss -ltnp | grep -E ':3100\b' || echo "port 3100 is free"
```

- **Node missing or older than v20.9** → see [Appendix A](#appendix-a--install-node-22-without-affecting-the-other-project).
- **Nginx missing** → `sudo apt update && sudo apt install -y nginx`
- **Port 3100 in use** → choose another free port (e.g. `3200`) and replace `3100` everywhere in this guide.

**Low-memory VPS (≤ 2 GB RAM)** — add swap so the build doesn't fail. Skip if swap already exists (`free -h` shows a Swap line above 0).

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Get the code

If the project folder is already there (it is: `~/projects/alarm/frontend`), just update it:

```bash
cd ~/projects/alarm
git pull
```

Fresh server instead? Clone it:

```bash
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/mhasan05/alarm.git
```

> Private repository: when git asks for a password, use a GitHub **Personal Access Token** (GitHub → Settings → Developer settings → Tokens), not your GitHub password.

---

## 3. Production settings

`.env*` files are not in git, so create this one on the server:

```bash
cd ~/projects/alarm/frontend
cat > .env.production << 'EOF'
# Hides the "Reset demo data" button in Settings. (The login page never shows demo accounts.)
NEXT_PUBLIC_DEMO_MODE=false
EOF
```

> This value is baked in at build time — after changing it, run the build again (step 4) and restart (step 5d).

---

## 4. Build

```bash
cd ~/projects/alarm/frontend
npm ci
npm run build
```

It must end with **`✓ Compiled successfully`** and a list of routes. If it stops with **`Killed`**, the server ran out of memory — add swap (step 1) and run `npm run build` again.

---

## 5. Run as a systemd service (port 3100)

**a) Stop any earlier PM2 copy** (only if you started one before; otherwise skip):

```bash
pm2 delete alarm-frontend 2>/dev/null; pm2 save 2>/dev/null; true
```

**b) Find Node's full path:**

```bash
which node
```

Usually `/usr/bin/node`. If you used nvm (Appendix A) it looks like `/home/backend_dev/.nvm/versions/node/v22.x.x/bin/node` — use that exact path in the next step.

**c) Create the service** (replace `/usr/bin/node` if your path differs):

```bash
sudo tee /etc/systemd/system/alarm-frontend.service > /dev/null << 'EOF'
[Unit]
Description=ALARM frontend (Next.js) — bdalarm.org
After=network.target

[Service]
Type=simple
User=backend_dev
Group=backend_dev
WorkingDirectory=/home/backend_dev/projects/alarm/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3100
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

**d) Start it and enable it on boot:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now alarm-frontend
sudo systemctl status alarm-frontend --no-pager     # should say: active (running)
curl -I http://127.0.0.1:3100                       # should say: HTTP/1.1 200 OK
```

---

## 6. Nginx — connect bdalarm.org to the app

```bash
sudo tee /etc/nginx/sites-available/bdalarm.org > /dev/null << 'EOF'
server {
    listen 80;
    server_name bdalarm.org www.bdalarm.org;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/bdalarm.org /etc/nginx/sites-enabled/bdalarm.org
sudo nginx -t && sudo systemctl reload nginx
```

`sudo nginx -t` must print **"syntax is ok"** and **"test is successful"**.

**Firewall** — allow web traffic:

```bash
sudo ufw status
sudo ufw allow 'Nginx Full'     # only if ufw is active and 80/443 aren't listed
```

If the firewall in **hPanel → VPS → Firewall** is enabled, allow ports **80** and **443** there as well.

Test: **http://bdalarm.org** opens the ALARM home page.

---

## 7. HTTPS (free certificate)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bdalarm.org -d www.bdalarm.org
```

Enter an email, accept the terms, and choose **redirect** (HTTP → HTTPS) if asked. Renewal is automatic; test it with:

```bash
sudo certbot renew --dry-run
```

> HTTPS is required — browsers only allow the microphone (meeting lobby) on secure sites.

✅ The site is live at **https://bdalarm.org**.

---

## 8. Updating the site later

**Create the deploy script once:**

```bash
cat > ~/projects/alarm/deploy-frontend.sh << 'EOF'
#!/usr/bin/env bash
set -e
cd ~/projects/alarm
git pull
cd frontend
npm ci
npm run build
sudo systemctl restart alarm-frontend
sleep 3
if systemctl is-active --quiet alarm-frontend; then
  echo "Frontend updated: https://bdalarm.org"
else
  echo "Service failed — check: sudo journalctl -u alarm-frontend -n 50"
  exit 1
fi
EOF
chmod +x ~/projects/alarm/deploy-frontend.sh
```

**After every push to GitHub, run:**

```bash
~/projects/alarm/deploy-frontend.sh
```

**Optional — no password prompt for the restart.** Allows `backend_dev` to restart only this service without a password:

```bash
echo 'backend_dev ALL=(root) NOPASSWD: /usr/bin/systemctl restart alarm-frontend' | sudo tee /etc/sudoers.d/alarm-frontend
sudo chmod 440 /etc/sudoers.d/alarm-frontend
sudo visudo -c        # must say: parsed OK
```

> Using nvm? Add this line near the top of the script (use the folder from step 5b) so the build uses Node 22:
> `export PATH="/home/backend_dev/.nvm/versions/node/v22.x.x/bin:$PATH"`

---

## 9. Everyday commands

| Task | Command |
|---|---|
| Status | `sudo systemctl status alarm-frontend` |
| Restart | `sudo systemctl restart alarm-frontend` |
| Stop / Start | `sudo systemctl stop alarm-frontend` · `sudo systemctl start alarm-frontend` |
| Live logs | `sudo journalctl -u alarm-frontend -f` |
| Last 100 log lines | `sudo journalctl -u alarm-frontend -n 100 --no-pager` |
| Test Nginx config | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |

---

## 10. Troubleshooting

| Problem | What to check |
|---|---|
| **502 Bad Gateway** | The app isn't running: `sudo systemctl status alarm-frontend` and `sudo journalctl -u alarm-frontend -n 50`. |
| Service keeps restarting | Wrong Node path in the service file (step 5b/5c), or the build is missing — run `npm run build`. |
| Build ends with **Killed** | Not enough memory — add swap (step 1). |
| The other project's site opens instead | `sudo nginx -T \| grep server_name` — `bdalarm.org` must appear; check the symlink in `/etc/nginx/sites-enabled/`. |
| Domain doesn't open at all | `ping bdalarm.org` shows the wrong IP (DNS), or ports 80/443 are blocked (ufw / hPanel firewall). |
| Certbot fails | DNS isn't pointing at the server yet — wait and repeat step 7. |
| Old page still showing after an update | Rebuild and restart (steps 4 and 5d), then hard-refresh the browser (Ctrl+F5). |

---

## 11. Notes for the client demo

**Logins** (password for every account: `Alarm@2026`):

| Role | Mobile | ALARM ID |
|---|---|---|
| সুপার অ্যাডমিন (Super Admin) | 01711000000 | KAR-571093 |
| প্রধান নির্বাহী সম্পাদক (Chief Executive Editor) | 01711000001 | KAR-482915 |
| নির্বাহী সম্পাদক (Executive Editor) | 01711000002 | KAR-736204 |
| তদন্ত সম্পাদক (Investigation Editor) | 01711000003 | KAR-615283 |
| রাজনৈতিক কর্মী (Political Activist) | 01711000004 | KAR-814369 |

Sign in with a mobile number and password — the login page has no demo-account shortcuts.

- **Meetings:** open a meeting link and enter an ALARM ID, e.g. `KAR-814369` on the ward 13 meeting (inside its area, so they join directly). The same ID on the চট্টগ্রাম meeting gets the "request to join" screen instead. The প্রধান নির্বাহী সম্পাদক's own ID needs a sign-in.
- **Data stays in each browser.** Until the backend is connected, whatever someone creates or changes is saved only in their own browser; every other person or device starts from the same sample data. Clearing the browser's site data restores it (the "Reset demo data" button appears only in demo mode).
- **Forgot password:** until the SMS service is connected, the reset screen shows the one-time code on screen.
- **Not indexed by search engines** — the site tells Google not to list it, which suits a client preview.

---

## Appendix A — Install Node 22 without affecting the other project

Changing the system Node could break the other project, so install Node 22 for this user only:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
which node        # copy this path for step 5c
```

Then continue from step 3. Use the `which node` path in the service file's `ExecStart`, and add the `export PATH=…` line to the deploy script (step 8).
