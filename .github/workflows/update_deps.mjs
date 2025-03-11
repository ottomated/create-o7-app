import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const isNewPr = process.argv[2] === 'main';
const dryRun = process.argv.includes('--dry-run');

const IGNORE_DEPS = ['common'];

export async function getUpdates() {
	const projectRoot = resolve(fileURLToPath(import.meta.url), '../../..');
	const templateRoot = join(projectRoot, 'template_builder/templates');

	/**
	 *
	 * @param {any} pkg
	 * @param {'dependencies' | 'devDependencies'} key
	 * @returns true if any dependencies were updated
	 */
	async function processDependencies(pkg, key) {
		if (!pkg[key]) return [];
		let dirty = [];
		for (const [name, currentVersion] of Object.entries(pkg[key])) {
			if (currentVersion === null) continue;
			if (IGNORE_DEPS.includes(name)) continue;

			let tag = 'latest';
			if (currentVersion.includes('-next')) {
				tag = 'next';
			}
			if (name === 'tailwindcss' && currentVersion[1] === '3') {
				tag = '3';
			}
			let prefix = currentVersion[0];
			if (prefix !== '^' && prefix !== '~') {
				prefix = '';
			}
			let latest = await latestVersion(name, tag);
			if (!latest) continue;
			latest = prefix + latest;

			if (latest !== currentVersion) {
				dirty.push([name, currentVersion, latest]);
				pkg[key][name] = latest;
			}
		}
		return dirty;
	}

	if (isNewPr) {
		const cargoTomlPath = join(projectRoot, 'Cargo.toml');
		const cargoToml = await readFile(cargoTomlPath, 'utf8');
		const version = cargoToml.match(/version = "(.*)"/)?.[1];
		if (!version) {
			console.error('Could not find version in Cargo.toml');
			process.exit(1);
		}
		const [major, minor, patch] = version.split('.');
		const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`;
		if (!dryRun) {
			await writeFile(
				cargoTomlPath,
				cargoToml.replace(/version = "(.*)"/, `version = "${newVersion}"`),
			);
		}
		console.log(`_Bumped version to ${newVersion}_\n\n`);
	}

	for await (const f of getFiles(templateRoot)) {
		const groups = basename(f).match(/^(\{[^{}]*\})?package\.json$/);
		if (!groups) continue;
		const pkg = JSON.parse(await readFile(f, 'utf8'));
		const updates = await Promise.all([
			processDependencies(pkg, 'dependencies'),
			processDependencies(pkg, 'devDependencies'),
		]).then((results) => results.flat());

		if (updates.length) {
			if (!dryRun) {
				await writeFile(f, JSON.stringify(pkg, null, '\t') + '\n');
			}
			const features = prettifyFeatures(groups[1]);
			console.log(`| \`${features}\` | old | new |`);
			console.log('|-|-|-|');
			for (const [name, currentVersion, latest] of updates) {
				console.log(`| ${name} | \`${currentVersion}\` | \`${latest}\` |`);
			}
			console.log('\n\n');
		}
	}
	const cloudflareVersion = await latestVersion(
		'@cloudflare/workers-types',
		'latest',
	);
	const cloudflareDate = cloudflareVersion.split('.')[1];
	if (!cloudflareDate || !/^[0-9]{8}$/.test(cloudflareDate)) {
		console.error(
			`Invalid @cloudflare/workers-types version: ${cloudflareVersion}`,
		);
		process.exit(1);
	}
	const compatibilityDate = `${cloudflareDate.substring(
		0,
		4,
	)}-${cloudflareDate.substring(4, 6)}-${cloudflareDate.substring(6, 8)}`;

	let changedFiles = [];
	for await (const f of getFiles(templateRoot)) {
		const groups = basename(f).match(/^(\{[^{}]*\})?wrangler\.jsonc$/);

		if (!groups) continue;
		const wrangler = await import(f, { assert: { type: 'jsonc' } });

		const oldVersion = wrangler.compatibility_date;

		if (oldVersion !== compatibilityDate) {
			if (!dryRun) {
				const text = (await readFile(f, 'utf8')).replace(
					`"${oldVersion}"`,
					`"${compatibilityDate}"`,
				);
				await writeFile(f, text);
			}
			changedFiles.push([prettifyFeatures(groups[1]), oldVersion]);
		}
	}
	if (changedFiles.length) {
		console.log(`| \`compatibility_date\` | old | new |`);
		console.log('|-|-|-|');
		for (const [name, oldVersion] of changedFiles) {
			console.log(`| ${name} | \`${oldVersion}\` | \`${compatibilityDate}\` |`);
		}
		console.log('\n\n');
	}
}

/**
 *
 * @param {string} packageName
 * @param {string} tag
 * @returns {Promise<string>}
 */
async function latestVersion(packageName, tag) {
	const url = new URL(
		encodeURIComponent(packageName).replace(/^%40/, '@'),
		'https://registry.npmjs.org/',
	);
	const res = await fetch(url, {
		headers: {
			accept:
				'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
		},
	});
	const data = await res.json();

	if (packageName === 'tailwindcss' && tag === '3') {
		const v3Versions = Object.keys(data?.versions ?? {})
			.filter((v) => Bun.semver.satisfies(v, '3'))
			.sort(Bun.semver.order);
		const mostRecent = v3Versions[v3Versions.length - 1];
		return mostRecent;
	}

	return data?.['dist-tags']?.[tag];
}

/**
 *
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* getFiles(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const res = resolve(dir, dirent.name);
		if (dirent.isDirectory()) {
			yield* getFiles(res);
		} else {
			yield res;
		}
	}
}
/**
 * @param {string | undefined} features
 */
function prettifyFeatures(features) {
	if (features === undefined) return 'base';
	return features
		.substring(1, features.length - 1) // strip {}
		.replace(/,/g, ', ') // add spaces to commas
		.replace(/\|/g, ' \\| '); // escape and prettify pipes
}

getUpdates();
