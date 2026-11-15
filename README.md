# SQUADREC

Premium music discovery, digital music store and exclusive music acquisition platform.

## Stack

- Next.js App Router, React and TypeScript
- Neon PostgreSQL with Prisma
- Auth.js credentials authentication
- Vercel Blob for private media uploads
- Resend for transactional email verification

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the values.

3. Generate the Prisma client and apply database migrations:

```bash
npx prisma generate
npm run db:deploy
```

4. Start the app:

```bash
npm run dev
```

## Required environment variables

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `AUTH_SECRET`: Auth.js secret.
- `AUTH_URL`: Canonical application URL.
- `RESEND_API_KEY`: Resend API key used to deliver verification emails.
- `EMAIL_FROM`: Verified sender address, for example `SQUADREC <no-reply@yourdomain.com>`.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for private verification documents and media uploads.

Registration intentionally remains unavailable until the Resend sender and API key are configured. New accounts must verify their email before credentials sign-in is allowed.

## Account setup flow

1. Choose Artist / Creator, Rightsholder, or Label / Publisher.
2. Submit name, email and password.
3. Verify the email using the one-time link (30-minute expiry).
4. Sign in to the account workspace.

Account type is stored separately from platform authorization role. Selecting an account type does not automatically grant verified artist upload permissions, industry catalogue access, or administrative privileges. Those remain subject to their existing review and approval workflows.

## Scripts

- `npm run dev`: local development
- `npm run build`: production build
- `npm run start`: production server
- `npm run db:generate`: generate Prisma client
- `npm run db:deploy`: apply committed migrations
- `npm run lint`: ESLint
