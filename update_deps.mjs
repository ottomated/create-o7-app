import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';

const root = resolve(fileURLToPath(import.meta.url), '../template_builder/templates');

const dependencies = new Map();

for await (const f of getFiles(root)) {
	if (!/^(\{[^{}]*\})?package\.json$/.test(basename(f))) continue;
	const pkg = JSON.parse(await readFile(f, 'utf8'));
	const entries = [
		...Object.entries(pkg.dependencies || {}),
		...Object.entries(pkg.devDependencies || {})
	];
	for (const [name, version] of entries) {
		if (version === null) continue;
		dependencies.set(name, [version, basename(f)]);
	}
}

const neededUpgrades = new Map();

for (const [name, [version, file]] of dependencies) {
	const latest = await latestVersion(name);
	if (!latest) continue;
	if (latest !== version.replace(/^[\^~]/, '')) {
		if (!neededUpgrades.has(file)) neededUpgrades.set(file, []);
		neededUpgrades.get(file).push([name, version, latest]);
	}
}

for (const [file, upgrades] of neededUpgrades) {
	console.log('\n' + file);
	for (const [name, version, latest] of upgrades) {
		console.log(`  ${name}: ${version} -> ${latest}`);
	}
}

async function latestVersion(packageName) {
	const url = new URL(encodeURIComponent(packageName).replace(/^%40/, '@'), 'https://registry.npmjs.org/');
	const res = await fetch(url, {
		headers: { accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*' }
	});
	const data = await res.json();
	return data?.['dist-tags']?.latest;
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
