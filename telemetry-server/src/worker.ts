import { z } from 'zod';

const telemetrySchema = z.object({
	version: z
		.string()
		// Semver regex from https://semver.org
		.regex(
			/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
		),
	package_manager: z.enum(['Npm', 'Pnpm', 'Yarn', 'Bun']),
	install_deps: z.boolean(),
	git_init: z.boolean(),
	features: z.array(z.string()),
});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== 'POST')
			return new Response('Method not allowed', { status: 405 });

		const url = new URL(request.url);
		if (url.pathname !== '/report')
			return new Response('Not found', { status: 404 });

		const body = await request.json().catch(() => null);
		if (!body) {
			return new Response('Bad request', { status: 400 });
		}

		const telemetry = telemetrySchema.safeParse(body);

		if (!telemetry.success) {
			return new Response('Bad request', { status: 400 });
		}

		ctx.waitUntil(
			env.DB.prepare(
				'INSERT INTO telemetry (version, package_manager, install_deps, git_init, features, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			)
				.bind(
					telemetry.data.version,
					telemetry.data.package_manager,
					telemetry.data.install_deps,
					telemetry.data.git_init,
					JSON.stringify(telemetry.data.features),
					new Date().toISOString(),
				)
				.run(),
		);

		return new Response('OK');
	},
} satisfies ExportedHandler<Env>;
