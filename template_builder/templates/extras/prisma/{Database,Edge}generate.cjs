const { Logger, DialectManager, Generator } = require('kysely-codegen');
const { join } = require('node:path');

require('dotenv').config();

async function generate() {
	const { DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_NAME } =
		process.env;
	if (
		!DATABASE_USERNAME ||
		!DATABASE_PASSWORD ||
		!DATABASE_HOST ||
		!DATABASE_NAME
	) {
		console.warn(
			'DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_HOST and DATABASE_NAME must be set'
		);
		return;
	}

	const logger = new Logger(2);

	const databaseUrl = `mysql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}?ssl={"rejectUnauthorized":true}`;

	const dialectManager = new DialectManager();
	const dialect = dialectManager.getDialect('mysql');

	const db = await dialect.introspector.connect({
		connectionString: databaseUrl,
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
