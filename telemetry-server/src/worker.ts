import * as v from 'valibot';

const telemetrySchema = v.object({
	version: v.pipe(
		v.string(),
		v.regex(
			/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
			'Invalid semver',
		),
	),
	package_manager: v.picklist(['Npm', 'Pnpm', 'Yarn', 'Bun']),
	install_deps: v.boolean(),
	git_init: v.boolean(),
	features: v.array(v.string()),
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

		const telemetry = v.safeParse(telemetrySchema, body);

		if (!telemetry.success) {
			return new Response('Bad request', { status: 400 });
		}

		ctx.waitUntil(
			env.DB.prepare(
				'INSERT INTO telemetry (version, package_manager, install_deps, git_init, features, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			)
				.bind(
					telemetry.output.version,
					telemetry.output.package_manager,
					telemetry.output.install_deps,
					telemetry.output.git_init,
					JSON.stringify(telemetry.output.features),
					new Date().toISOString(),
				)
				.run(),
		);

		return new Response('OK');
	},
} satisfies ExportedHandler<Env>;
