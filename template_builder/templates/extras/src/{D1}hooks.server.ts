import { initDb } from '$lib/db';

export async function handle({ event, resolve }) {
	const db = event.platform!.env.DB;
	initDb(db);
	return resolve(event);
}
