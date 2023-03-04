
const { Binary } = require('binary-install');
const os = require('os');
const { version } = require('./package.json');

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

module.exports = {
	bin: new Binary(
		'create-o7-app',
		`https://github.com/ottomated/create-o7-app/releases/download/${version}/create-o7-app-${supported.file}`
	),
};
