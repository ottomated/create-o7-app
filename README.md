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
	<img src="https://i.imgur.com/K122UVq.gif">
</p>

<h2>What is the o7 Stack?</h2>

- [Svelte](https://svelte.dev)
- [tRPC](https://trpc.io)
- [Tailwind CSS](https://tailwindcss.com/)
- [Typescript](https://www.typescriptlang.org/)
- [Prisma](https://www.prisma.io/)
- [Kysely](https://github.com/kysely-org/kysely)
- [Cloudflare Workers](https://workers.cloudflare.com/)

Why both Prisma and Kysely? `create-o7-app`'s template includes Kysely for **Edge support** and **fast cold starts**, with all the convenience of using Prisma to define your database model.

<h2>Getting Started</h2>

First, run the CLI to scaffold your app:

**pnpm**

```
pnpm create o7-app@latest
```

**npm**

```
npm create o7-app@latest
```

**yarn**

```
yarn create o7-app
```

Then, open your new app in your favorite IDE and get started! A good place to look first is `src/routes/+page.svelte` for your frontend or `src/lib/server/routes/_app.ts` for tRPC.

## Changelog

### `0.4.0`

- Upgrade to SvelteKit 2 (and various other package updates)
- Support for the Svelte 5 preview
- Experimental support for D1 (including Prisma migrations!)
- Remove support for Vanilla CSS (tailwind only!)
