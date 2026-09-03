# Jedlik Motors Leave Tracker — Setup Guide

This app is hosted on **Vercel**. The setup below walks you through deploying
your own instance from this repo.

## Quick Start (5 steps)

### 1. Install dependencies

```bash
npm install
```

---

### 2. Set up Google Sheets (your database)

This app uses a Google Spreadsheet as its database. You need three things:
a **spreadsheet**, a **service account**, and the **credentials**.

#### A. Create the spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**
2. Name it something like "Jedlik Leave Tracker"
3. Copy the **Spreadsheet ID** from the URL — it's the long string between `/d/` and `/edit`:

```
https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit
                                       └──────── THIS PART ────────┘
```

#### B. Create a Google Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Search for **"Google Sheets API"** in the search bar and **Enable** it
4. Go to **IAM & Admin → Service Accounts** (in the left sidebar)
5. Click **"+ Create Service Account"**
   - Give it a name (e.g. "leave-tracker")
   - Click Create → Done
6. Click on the service account you just created
7. Go to the **Keys** tab → **Add Key → Create new key → JSON**
8. A `.json` file will download — open it, you'll need two values:
   - `client_email` (looks like `name@project.iam.gserviceaccount.com`)
   - `private_key` (a long key starting with `-----BEGIN PRIVATE KEY-----`)

#### C. Share the spreadsheet

1. Open your Google Spreadsheet
2. Click **Share** (top right)
3. Paste the `client_email` from the JSON key file
4. Give it **Editor** access
5. Click Send

---

### 3. Fill in `.env.local`

The seed script (Step 4) reads credentials from `.env.local`, so fill them in
even though the app itself will run on Vercel.

Open the file `.env.local` in the project root. It already has `AUTH_SECRET` filled in.
Fill in the three Google Sheets values:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-spreadsheet-id
```

> **Important:** The `GOOGLE_PRIVATE_KEY` must be wrapped in **double quotes** (`"`).
> Copy the `private_key` value directly from the downloaded JSON file —
> it already contains `\n` characters which is exactly what's needed.

---

### 4. Run the seed script

This creates all the sheet tabs and your first admin account. It must be run
**locally** because it writes to your Google Spreadsheet using your service
account credentials:

```bash
npx tsx scripts/seed-admin.ts
```

You should see output like:

```
🔗 Connecting to Google Sheets...

📋 Setting up sheet tabs...
   ✨ Created "Employees"
   ✨ Created "Leave Requests"
   ✨ Created "Public Holidays"
   ✨ Created "Leave Ledger"
   ✨ Created "Regional Holiday Requests"
   ✨ Created "Audit Log"
   ✨ Created "Settings"

👤 Setting up admin user...
   ✨ Created admin user
      Email:    admin@jedlik.com
      Password: admin123

⚙️  Setting up defaults...
   ✨ Added 3 default settings

🎉 Setup complete! Ready to deploy to Vercel.
```

---

### 5. Deploy to Vercel

#### A. Push the repo to GitHub

If this repo isn't on GitHub yet, push it now (Vercel deploys from a Git
provider).

#### B. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with GitHub
3. Click **Import** next to your `leave-tracker-jedlik` repository
4. Leave the build settings as-is — Next.js is detected automatically

#### C. Add environment variables

Before clicking **Deploy**, open the **Environment Variables** section and
add the same three values from Step 3, plus `AUTH_SECRET` (copy it from
your local `.env.local`):

| Name | Value |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `your-service-account@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | The full key wrapped in `"..."`, with `\n` characters preserved |
| `GOOGLE_SHEET_ID` | Your spreadsheet ID |
| `AUTH_SECRET` | Already in your local `.env.local` — copy it |
| `RESEND_API_KEY` | (Optional) only if you want email notifications |

> **Tip:** For `GOOGLE_PRIVATE_KEY`, paste the exact value from your
> `.env.local` file (with the double quotes and `\n` characters intact).
> Vercel stores it as a single string.

#### D. Deploy

Click **Deploy**. The first build takes ~1–2 minutes. When it finishes,
Vercel gives you a URL like `https://leave-tracker-jedlik.vercel.app`.

#### E. (Recommended) Generate a new `AUTH_SECRET` for production

Vercel generated a default `AUTH_SECRET` when you imported the project, but
it's safer to set your own:

```bash
openssl rand -base64 32
```

Paste the output as the value of `AUTH_SECRET` in the Vercel project
**Settings → Environment Variables**, then redeploy.

---

## Logging in

Open your Vercel URL (e.g. `https://leave-tracker-jedlik.vercel.app`) and
log in with:

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@jedlik.com` |
| Password | `admin123`         |

You'll be asked to change your password on first login.

---

## What's next after setup?

- **Add employees** from the dashboard (Admin → Employees)
- **Configure holidays** (Admin → Public Holidays)
- **Set leave entitlement** (Admin → Settings) — default is 1.5 days/month
- **Email notifications** are optional — add `RESEND_API_KEY` in Vercel's
  environment variables if you want them

---

## File Reference

| File | Purpose |
|------|---------|
| `.env.local` | Used locally only — for the seed script |
| `.env.example` | Template showing all available env vars |
| `scripts/seed-admin.ts` | Creates sheet tabs + admin user (run locally once) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Missing Google Sheets credentials"** | Fill in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in **both** `.env.local` (local) and Vercel env vars (production) |
| **"Missing GOOGLE_SHEET_ID"** | Fill in `GOOGLE_SHEET_ID` in both `.env.local` and Vercel env vars |
| **403 error from Google API** | Make sure you shared the spreadsheet with the service account email (Step 2C) |
| **"Google Sheets API has not been enabled"** | Enable the Sheets API in Google Cloud Console (Step 2B, point 3) |
| **Vercel build fails** | Check the build log in the Vercel dashboard. Most often it's a missing env var or a typo in `GOOGLE_PRIVATE_KEY` (the `\n` characters must survive the paste) |
| **Emails not sending** | This is optional. Set `RESEND_API_KEY` in Vercel env vars if you want emails |
| **Seed script fails with "Could not read .env.local"** | Make sure `.env.local` exists in the project root |
| **"Invalid login" on Vercel after deploying** | You may have forgotten to run the seed script (Step 4) against your production spreadsheet |
