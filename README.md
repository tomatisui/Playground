## Playground

Starter app built with Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma, and SQLite.

## Getting Started

```bash
npm install
npm run db:init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Prisma is configured for a local SQLite database through `.env`.

Useful commands:

```bash
npm run prisma:generate
npm run db:init
npm run db:migrate
npm run db:studio
```

The Prisma schema lives in `prisma/schema.prisma`, and the generated client is written to `src/generated/prisma`.

`db:init` applies the checked-in SQLite migration directly. `db:migrate` is still available for Prisma workflows, but on this local Node 25 setup the Prisma schema engine may need extra troubleshooting before it runs cleanly.

## Project Structure

- `src/app`: App Router pages and layout
- `src/lib/prisma.ts`: shared Prisma client singleton
- `prisma/schema.prisma`: database models
- `.env`: local database connection string

## Next Steps

- Add API routes or server actions for creating and updating records
- Extend the Prisma schema with your app's domain models
- Replace the starter dashboard with your product UI
