-- SQLITE
CREATE TABLE telemetry (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	version TEXT NOT NULL,
	package_manager TEXT NOT NULL,
	features TEXT NOT NULL,
	install_deps BOOLEAN NOT NULL,
	git_init BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL
)
