use std::path::PathBuf;

use crate::utils::{get_package_manager, PackageManager};
use anyhow::Result;
use crossterm::style::{style, Stylize};
use inquire::{ui::RenderConfig, Confirm};

pub fn prompt(render_config: &RenderConfig) -> Result<Option<PathBuf>> {
	let mut package_manager = get_package_manager();

	let package_manager_path = match package_manager {
		PackageManager::Npm => which::which("npm"),
		PackageManager::Pnpm => which::which("pnpm"),
		PackageManager::Yarn => which::which("yarn"),
		PackageManager::Bun => which::which("bun"),
	};

	let mut old_package_manager = None;

	let (path, is_fallback) =
		match package_manager_path {
			Ok(package_manager_path) => (Some(package_manager_path), false),
			Err(_) => {
				let npm_path = which::which("npm");
				match npm_path {
					Ok(npm_path) => {
						old_package_manager = Some(package_manager);
						package_manager = PackageManager::Npm;
						(Some(npm_path), true)
					}
					Err(_) => {
						let warn = style("!").red();
						let message = style(format!(
							"No package manager installed - https://volta.sh to install"
						))
						.yellow()
						.bold();
						println!("{warn} {message}");
						println!(
						"  {}",
						style("(you must install a package manager, such as npm, before developing)").yellow().dim()
					);
						return Ok(None);
					}
				}
			}
		};

	let message = format!("Would you like us to run '{package_manager} install'?");
	let mut install_deps = Confirm::new(&message)
		.with_render_config(*render_config)
		.with_default(true);

	let help = format!(
		"Falling back to npm, as {} was not found",
		old_package_manager.unwrap_or(PackageManager::Npm)
	);
	if is_fallback {
		install_deps = install_deps.with_help_message(&help);
	}
	let install_deps = install_deps.prompt()?;

	match install_deps {
		true => Ok(path),
		false => Ok(None),
	}
}
