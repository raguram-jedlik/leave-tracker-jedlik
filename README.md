# Jedlik Motors Leave Tracker

A leave tracking app for Jedlik Motors, built with Next.js 16 and Google
Sheets as a backend. Employees request leave, admins approve it, and the
ledger updates automatically.

The app is deployed on **Vercel** — see [SETUP.md](./SETUP.md) for the
full deployment guide (Google Sheets credentials, seeding the database,
importing into Vercel, environment variables, etc.).

## Features

- Employee leave requests (annual, sick, unpaid, regional holidays)
- Manager approval workflow
- Automatic leave ledger with running balances
- Public holiday configuration per region
- Email notifications via Resend (optional)
- Audit log for accountability

## Tech stack

- **Next.js 16** (App Router)
- **NextAuth** for authentication
- **Google Sheets API** as the database
- **Resend** for transactional email
- **Tailwind CSS** for styling

## Local development

The app is intended to run on Vercel, but you can develop locally:

```bash
npm install
npm run dev
```

You'll still need a `.env.local` with Google Sheets credentials — see
[SETUP.md](./SETUP.md) for details.

## License

Private project. All rights reserved.
