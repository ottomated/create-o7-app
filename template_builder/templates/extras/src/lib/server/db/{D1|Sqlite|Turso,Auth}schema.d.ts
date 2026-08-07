import type { ColumnType } from 'kysely';
export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Session = {
	/**
	 * @kyselyType(`s_${string}`)
	 */
	id: `s_${string}`;
	/**
	 * @kyselyType(`u_${string}`)
	 */
	user_id: `u_${string}`;
	/**
	 * @kyselyType(Uint8Array)
	 */
	hash: Uint8Array;
	last_verified_at: number;
	created_at: number;
};
export type User = {
	/**
	 * @kyselyType(`u_${string}`)
	 */
	id: `u_${string}`;
	twitch_id: string;
	username: string;
};
export type DB = {
	Session: Session;
	User: User;
};
