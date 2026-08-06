import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import * as semver from 'semver';
import JSONC from 'tiny-jsonc';

const is_new_pr = process.argv[2] === 'main';
const dry_run = process.argv.includes('--dry-run');

const IGNORE_DEPS = ['common'];

export async function get_updates() {
	const project_root = resolve(fileURLToPath(import.meta.url), '../../..');
	const template_root = join(project_root, 'template_builder/templates');

	/**
	 *
	 * @param {any} pkg
	 * @param {'dependencies' | 'devDependencies'} key
	 * @returns true if any dependencies were updated
	 */
	async function process_dependencies(pkg, key) {
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
			let latest = await latest_version(name, tag);
			if (!latest) continue;
			latest = prefix + latest;

			if (latest !== currentVersion) {
				dirty.push([name, currentVersion, latest]);
				pkg[key][name] = latest;
			}
		}
		return dirty;
	}

	if (is_new_pr) {
		const cargo_toml_path = join(project_root, 'Cargo.toml');
		const cargo_toml = await readFile(cargo_toml_path, 'utf8');
		const version = cargo_toml.match(/version = "(.*)"/)?.[1];
		if (!version) {
			console.error('Could not find version in Cargo.toml');
			process.exit(1);
		}
		const [major, minor, patch] = version.split('.');
		const new_version = `${major}.${minor}.${parseInt(patch) + 1}`;
		if (!dry_run) {
			await writeFile(
				cargo_toml_path,
				cargo_toml.replace(/version = "(.*)"/, `version = "${new_version}"`),
			);
		}
		console.log(`_Bumped version to ${new_version}_\n\n`);
	}

	for await (const f of get_files(template_root)) {
		const groups = basename(f).match(/^(\{[^{}]*\})?package\.json$/);
		if (!groups) continue;
		const pkg = JSON.parse(await readFile(f, 'utf8'));
		const updates = await Promise.all([
			process_dependencies(pkg, 'dependencies'),
			process_dependencies(pkg, 'devDependencies'),
		]).then((results) => results.flat());

		if (updates.length) {
			if (!dry_run) {
				await writeFile(f, JSON.stringify(pkg, null, '\t') + '\n');
			}
			const features = prettify_features(groups[1]);
			console.log(`| \`${features}\` | old | new |`);
			console.log('|-|-|-|');
			for (const [name, current_version, latest] of updates) {
				console.log(`| ${name} | \`${current_version}\` | \`${latest}\` |`);
			}
			console.log('\n\n');
		}
	}
	const cloudflare_version = await latest_version(
		'@cloudflare/workers-types',
		'latest',
	);
	const cloudflare_date = cloudflare_version.split('.')[1];
	if (!cloudflare_date || !/^[0-9]{8}$/.test(cloudflare_date)) {
		console.error(
			`Invalid @cloudflare/workers-types version: ${cloudflare_version}`,
		);
		process.exit(1);
	}
	const compatibility_date = `${cloudflare_date.substring(
		0,
		4,
	)}-${cloudflare_date.substring(4, 6)}-${cloudflare_date.substring(6, 8)}`;

	const changed_files = [];
	for await (const f of get_files(template_root)) {
		const groups = basename(f).match(/^(\{[^{}]*\})?wrangler\.jsonc$/);

		if (!groups) continue;
		const wrangler = JSONC.parse(await readFile(f, 'utf8'));

		const old_version = wrangler.compatibility_date;

		if (old_version !== compatibility_date) {
			if (!dry_run) {
				const text = (await readFile(f, 'utf8')).replace(
					`"${old_version}"`,
					`"${compatibility_date}"`,
				);
				await writeFile(f, text);
			}
			changed_files.push([prettify_features(groups[1]), old_version]);
		}
	}
	if (changed_files.length) {
		console.log(`| \`compatibility_date\` | old | new |`);
		console.log('|-|-|-|');
		for (const [name, oldVersion] of changed_files) {
			console.log(`| ${name} | \`${oldVersion}\` | \`${compatibility_date}\` |`);
		}
		console.log('\n\n');
	}
}

/**
 *
 * @param {string} package_name
 * @param {string} tag
 * @returns {Promise<string>}
 */
async function latest_version(package_name, tag) {
	const url = new URL(
		encodeURIComponent(package_name).replace(/^%40/, '@'),
		'https://registry.npmjs.org/',
	);
	const res = await fetch(url, {
		headers: {
			accept:
				'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
		},
	});
	const data = await res.json();

	if (package_name === 'tailwindcss' && tag === '3') {
		const v3Versions = Object.keys(data?.versions ?? {})
			.filter((v) => semver.satisfies(v, '3'))
			.sort(semver.compare);
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
async function* get_files(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const res = resolve(dir, dirent.name);
		if (dirent.isDirectory()) {
			yield* get_files(res);
		} else {
			yield res;
		}
	}
}
/**
 * @param {string | undefined} features
 */
function prettify_features(features) {
	if (features === undefined) return 'base';
	return features
		.substring(1, features.length - 1) // strip {}
		.replace(/,/g, ', ') // add spaces to commas
		.replace(/\|/g, ' \\| '); // escape and prettify pipes
}

get_updates();
