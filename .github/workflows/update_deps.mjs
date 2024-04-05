import { resolve, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile } from 'node:fs/promises';

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
			const tag = currentVersion.includes('-next') ? 'next' : 'latest';
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

	for await (const f of getFiles(templateRoot)) {
		if (!/^(\{[^{}]*\})?package\.json$/.test(basename(f))) continue;
		const pkg = JSON.parse(await readFile(f, 'utf8'));
		const updates = await Promise.all([
			processDependencies(pkg, 'dependencies'),
			processDependencies(pkg, 'devDependencies'),
		]).then((results) => results.flat());

		if (updates.length) {
			await writeFile(f, JSON.stringify(pkg, null, '\t') + '\n');
			console.log(`### ${relative(templateRoot, f)}\n\n`);
			for (const [name, currentVersion, latest] of updates) {
				console.log(`- \`${name}\`: \`${currentVersion}\` -> \`${latest}\``);
			}
		}
	}
}

getUpdates();
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
	return data?.['dist-tags']?.[tag];
}

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
