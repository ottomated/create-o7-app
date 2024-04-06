const os = require('os');

const platforms = [
	{
		type: 'Windows_NT',
		arch: 'x64',
		file: 'win64.exe',
	},
	{
		type: 'Windows_NT',
		arch: 'ia32',
		file: 'win32.exe',
	},
	{
		type: 'Linux',
		arch: 'x64',
		file: 'linux',
	},
	{
		type: 'Darwin',
		arch: 'x64',
		file: 'macos',
	},
	{
		type: 'Darwin',
		arch: 'arm64',
		file: 'macos-arm64',
	},
];

const type = os.type();
const arch = os.arch();
const supported = platforms.find((p) => p.type === type && p.arch === arch);
if (!supported) {
	throw new Error(`Unsupported platform: ${type} ${arch}`);
}

const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');
const { Readable } = require('stream');
const { x: extract } = require('tar');
const { spawnSync } = require('child_process');
const { version } = require('./package.json');

const dir = join(__dirname, 'node_modules', '.bin');
const bin = join(dir, `create-o7-app-${supported.file}`);

const exists = existsSync(bin);

async function install() {
	if (exists) return;

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const res = await fetch(
		`https://github.com/ottomated/create-o7-app/releases/download/${version}/create-o7-app-${supported.file}.tar.gz`,
	);
	if (!res.ok) {
		console.error(`Error fetching release: ${res.statusText}`);
		process.exit(1);
	}
	const sink = Readable.fromWeb(res.body).pipe(extract({ strip: 1, C: dir }));

	return new Promise((resolve) => {
		sink.on('finish', () => resolve());
		sink.on('error', (err) => {
			console.error(`Error fetching release: ${err.message}`);
			process.exit(1);
		});
	});
}

async function run() {
	if (!exists) await install();
	const args = process.argv.slice(2);
	const child = spawnSync(bin, args, {
		cwd: process.cwd(),
		stdio: 'inherit',
	});
	if (child.error) {
		console.error(child.error);
		child.exit(1);
	}
	process.exit(child.status);
}

module.exports = { install, run };
