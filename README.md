<p align="center">
  <img src="https://i.postimg.cc/T1Wk3khh/logo.png" width="112" alt="o7 Logo" />
</p>

<h1 align="center">create-o7-app</h1>

<p align="center">An opinionated CLI for creating type-safe Svelte apps.</p>
<p align="center">
<code>pnpm create o7-app</code>
</p>
<br />

<p align="center">
	<img src="https://github.com/ottomated/create-o7-app/assets/31470743/24427098-4d2d-443c-bf70-f8f8972e8bb6">
</p>

<h2>What is the o7 Stack?</h2>

- [Svelte](https://svelte.dev)
- [tRPC](https://trpc.io)
- [Tailwind CSS](https://tailwindcss.com/)
- [Typescript](https://www.typescriptlang.org/)
- [Prisma](https://www.prisma.io/)
- [Kysely](https://github.com/kysely-org/kysely)
- [Lucia](https://lucia-auth.com/)

Why both Prisma and Kysely? `create-o7-app`'s template includes Kysely for **Edge support** and **fast cold starts**, with all the convenience of using Prisma to define your database model.

<h2>Getting Started</h2>

First, run the CLI to scaffold your app:

```bash
pnpm create o7-app
# OR
bun create o7-app
# OR
npm create o7-app@latest
# OR
yarn create o7-app
```

Then, open your new app in your favorite IDE and get started! A good place to look first is `src/routes/+page.svelte` for your frontend or `src/lib/server/routes/_app.ts` for tRPC.

## [Changelog](https://github.com/ottomated/create-o7-app/blob/main/CHANGELOG.md)

## Upcoming

- [ ] Move the tutorial to a README file
- [ ] Replace the dependency on `@tanstack/svelte-query` with a more lightweight tRPC client
