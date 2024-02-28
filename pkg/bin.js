const os = require('os');

const platforms = [
	{
		type: 'Windows_NT',
		arch: 'x64',
		file: 'win64.exe'
	},
	{
		type: 'Windows_NT',
		arch: 'ia32',
		file: 'win32.exe'
	},
	{
		type: 'Linux',
		arch: 'x64',
		file: 'linux'
	},
	{
		type: 'Darwin',
		arch: 'x64',
		file: 'macos'
	},
	{
		type: 'Darwin',
		arch: 'arm64',
		file: 'macos-arm64'
	},
];

const type = os.type();
const arch = os.arch();
const supported = platforms.find(
	(p) => p.type === type && p.arch === arch
);
if (!supported) {
	throw new Error(
		`Unsupported platform: ${type} ${arch}`
	);
}

const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');
const dir = join(__dirname, "node_modules", ".bin");
const bin = join(dir, `create-o7-app-${supported.file}`);

const exists = existsSync(bin);

async function install() {
	if (exists) return;

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const { version } = require('./package.json');
	const res = await require('axios')({
		url: `https://github.com/ottomated/create-o7-app/releases/download/${version}/create-o7-app-${supported.file}.tar.gz`,
		responseType: 'stream'
	}).catch(e => {
		console.error(`Error fetching release: ${e.message}`);
		process.exit(1);
	});
	return new Promise((resolve, reject) => {
		const sink = res.data.pipe(
			require('tar').x({ strip: 1, C: dir })
		);
		sink.on('finish', () => resolve());
		sink.on('error', err => {
			console.error(`Error fetching release: ${err.message}`);
			process.exit(1);
		});
	});
}

async function run() {
	if (!exists) await install();
	const args = process.argv.slice(2);
	const child = require('child_process').spawnSync(bin, args, {
		cwd: process.cwd(), stdio: 'inherit'
	});
	if (child.error) {
		console.error(child.error);
		child.exit(1);
	}
	process.exit(child.status);
}


module.exports = { install, run };
