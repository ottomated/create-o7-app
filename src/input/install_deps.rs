use std::{
	ffi::OsStr,
	path::{Path, PathBuf},
	process::Command,
};

use crate::utils::PackageManager;
use anyhow::{Context, Result};
use crossterm::style::{style, Stylize};
use inquire::{ui::RenderConfig, Confirm};

#[derive(Debug)]
pub struct ProjectPackageManager {
	pub package_manager: PackageManager,
	pub package_manager_version: Option<String>,
	pub exec_path: PathBuf,
}

impl ProjectPackageManager {
	pub fn version_string(&self) -> Option<String> {
		self.package_manager_version
			.as_ref()
			.map(|version| format!("{manager}@{version}", manager = self.package_manager))
	}
}

pub fn prompt(
	render_config: &RenderConfig,
	mut package_manager: PackageManager,
) -> Result<Option<ProjectPackageManager>> {
	let package_manager_path = which::which(format!("{}", package_manager));

	let mut old_package_manager = None;

	let (path, is_fallback) =
		match package_manager_path {
			Ok(package_manager_path) => (package_manager_path, false),
			Err(_) => {
				let npm_path = which::which("npm");
				match npm_path {
					Ok(npm_path) => {
						old_package_manager = Some(package_manager);
						package_manager = PackageManager::Npm;
						(npm_path, true)
					}
					Err(_) => {
						let warn = style("!").red();
						let message =
							style("No package manager installed - https://volta.sh to install")
								.yellow()
								.bold();
						println!("{warn} {message}");
						println!(
						"  {}",
						style("(you must install a package manager, such as pnpm, before developing)").yellow().dim()
					);
						return Ok(None);
					}
				}
			}
		};

	let message = format!("Would you like us to run '{package_manager} install'?");
	let mut install_deps = Confirm::new(&message)
		.with_render_config(*render_config)
		.with_default(package_manager != PackageManager::Npm);

	let help = format!(
		"Falling back to npm, as {} was not found",
		old_package_manager.unwrap_or(PackageManager::Npm)
	);
	if is_fallback {
		install_deps = install_deps.with_help_message(&help);
	}
	let install_deps = install_deps.prompt()?;

	if !install_deps {
		return Ok(None);
	}

	let version = match get_package_manager_version(&path) {
		Ok(version) => Some(version),
		Err(err) => {
			println!("{}", style(err).red());
			None
		}
	};

	Ok(Some(ProjectPackageManager {
		package_manager,
		package_manager_version: version,
		exec_path: path,
	}))
}

fn get_package_manager_version(exec_path: &Path) -> Result<String> {
	let output = Command::new(exec_path)
		.arg("--version")
		.output()
		.with_context(|| {
			format!(
				"Failed to execute {:?} --version",
				exec_path
					.file_name()
					.unwrap_or(OsStr::new("package manager"))
			)
		})?;

	let version = String::from_utf8(output.stdout)
		.context("package manager version is invalid UTF-8")?
		.trim()
		.to_string();

	Ok(version)
}
