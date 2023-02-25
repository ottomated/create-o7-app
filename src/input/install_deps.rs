use crate::utils::{get_package_manager, PackageManager};
use anyhow::Result;
use inquire::{ui::RenderConfig, Confirm};

pub fn prompt(render_config: &RenderConfig) -> Result<bool> {
	let package_manager = get_package_manager();

	let install_command = match package_manager {
		PackageManager::Npm => "npm install",
		PackageManager::Pnpm => "pnpm install",
		PackageManager::Yarn => "yarn",
		PackageManager::Bun => "bun install",
	};

	let install_deps = Confirm::new(&format!("Would you like us to run '{install_command}'?",))
		.with_render_config(*render_config)
		.with_default(true)
		.prompt()?;

	Ok(install_deps)
}
