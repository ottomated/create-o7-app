use std::{ffi::OsStr, process::Command};

use crate::{create::log_step_start, input::UserInput, utils::PackageManager};
use anyhow::{bail, Context, Result};

use super::log_step_end;

pub fn install_deps(input: &UserInput) -> Result<()> {
	let Some(pm) = &input.install_deps else {
		return Ok(());
	};

	let start = log_step_start("Installing dependencies...");

	let mut cmd = Command::new(&pm.exec_path);
	cmd.current_dir(&input.location.path).arg("install");
	#[cfg(test)]
	{
		cmd.stdout(std::process::Stdio::null())
			.stderr(std::process::Stdio::null());
	}
	let cmd = cmd.status().with_context(|| {
		format!(
			"Failed to execute {:?}",
			pm.exec_path
				.file_name()
				.unwrap_or(&OsStr::new("package manager"))
		)
	})?;

	println!();

	if !cmd.success() {
		bail!("Could not install dependencies");
	}

	// Run svelte-kit sync
	let mut sync = match pm.package_manager {
		PackageManager::Yarn => {
			let mut sync = Command::new(&pm.exec_path);
			sync.args(&["exec", "svelte-kit", "sync"]);
			sync
		}
		_ => {
			let mut sync = Command::new(input.location.path.join("node_modules/.bin/svelte-kit"));
			sync.arg("sync");
			sync
		}
	};
	sync.current_dir(&input.location.path);

	let sync = sync.status().context("Failed to run svelte-kit sync")?;

	if !sync.success() {
		bail!("Could not run svelte-kit sync");
	}

	log_step_end(start);

	Ok(())
}
