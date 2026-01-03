# 🚀 Deployment Checklist - Olympic Tracker

**Created:** December 31, 2024  
**Goal:** Deploy to `results.saltygoldsupply.com`

---

## Before You Start

- [ ] Have your GoDaddy login ready (for DNS)
- [ ] Have your Vercel account (create at vercel.com if needed)

---

## Step 1: Install Vercel CLI (if not already)

Open terminal and run:
```bash
npm install -g vercel
```

---

## Step 2: Login to Vercel

```bash
vercel login
```
Follow the prompts (email link or GitHub login).

---

## Step 3: Deploy the App

Navigate to the project folder and deploy:
```bash
cd c:\Users\rgnlc\.gemini\antigravity\scratch\Mass_Start_Olympic_Trials
vercel
```

**Prompts to answer:**
- Set up and deploy? → **Y**
- Which scope? → Your account
- Link to existing project? → **N** (create new)
- Project name? → `olympic-trials-tracker` (or your choice)
- Directory? → `.` (current)
- Override settings? → **N**

**Result:** You get a URL like `olympic-trials-tracker.vercel.app`

---

## Step 4: Add Custom Domain in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project → **Settings** → **Domains**
3. Type: `results.saltygoldsupply.com`
4. Click **Add**

Vercel will show you the DNS record needed (usually a CNAME).

---

## Step 5: Add DNS Record in GoDaddy

1. Log into GoDaddy → **My Products** → **DNS** for saltygoldsupply.com
2. Scroll to **CNAME Records**
3. Click **Add Record**:
   - **Type:** CNAME
   - **Name:** `results`
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** 1 Hour
4. **Save**

---

## Step 6: Wait & Verify

- DNS takes 5-15 minutes to propagate
- Vercel auto-provisions SSL certificate
- Visit `https://results.saltygoldsupply.com` to confirm

---

## Future Updates

After making changes locally, just run:
```bash
vercel --prod
```
Changes go live in ~30 seconds.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Domain already in use" | Remove from old Vercel project first |
| SSL not working | Wait longer (up to 24h for DNS) |
| 404 errors | Make sure `index.html` is at root |

---

## Quick Reference

| What | Value |
|------|-------|
| **Subdomain** | `results.saltygoldsupply.com` |
| **DNS Record Type** | CNAME |
| **DNS Name** | `results` |
| **DNS Value** | `cname.vercel-dns.com` |

---

**Estimated Time:** 10-15 minutes

Happy New Year! 🎉
