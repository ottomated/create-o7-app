use std::env;

include!(concat!(env!("OUT_DIR"), "/config.rs"));

pub enum PackageManager {
	Npm,
	Pnpm,
	Yarn,
	Bun,
}

pub fn get_package_manager() -> PackageManager {
	// This environment variable is set by npm and yarn but pnpm seems less consistent
	let user_agent = env::var("npm_config_user_agent");

	if user_agent.is_err() {
		return PackageManager::Npm;
	}
	let user_agent = user_agent.unwrap().to_lowercase();

	if user_agent.starts_with("yarn") {
		PackageManager::Yarn
	} else if user_agent.starts_with("pnpm") {
		PackageManager::Pnpm
	} else if user_agent.starts_with("bun") {
		PackageManager::Bun
	} else {
		PackageManager::Npm
	}
}
