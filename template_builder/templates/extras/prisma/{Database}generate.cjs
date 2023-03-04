const { Logger, DialectManager, Generator } = require('kysely-codegen');
const { join } = require('node:path');

require('dotenv').config();

async function generate() {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}
	const logger = new Logger(2);

	const url = new URL(process.env.DATABASE_URL);
	const databasePath = join('prisma', url.pathname);

	const dialectManager = new DialectManager();
	const dialect = dialectManager.getDialect('sqlite');

	const db = await dialect.introspector.connect({
		connectionString: databasePath,
		dialect,
	});

	const generator = new Generator();

	await generator.generate({
		camelCase: true,
		db,
		dialect,
		logger,
		outFile: join(__dirname, '../src/lib/db/schema.d.ts'),
	});

	await db.destroy();
}
generate();
