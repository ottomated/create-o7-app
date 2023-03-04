use std::{ffi::OsStr, process::Command};

use crate::{create::log_step_start, input::UserInput};
use anyhow::{Context, Result};

use super::log_step_end;

pub fn install_deps(input: &UserInput) -> Result<()> {
	if input.install_deps.is_none() {
		return Ok(());
	}
	let pm = input.install_deps.as_ref().unwrap();

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
		return Err(anyhow::anyhow!("Could not install dependencies"));
	}

	log_step_end(start);

	Ok(())
}
