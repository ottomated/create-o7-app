use std::{
	path::PathBuf,
	process::{Command, Stdio},
};

use anyhow::{Context, Result};

use crate::input::UserInput;

pub fn create_repo(input: &UserInput) -> Result<()> {
	if input.git.is_none() {
		return Ok(());
	}
	let git = input.git.as_ref().unwrap();
	println!("Creating git repository...\n");
	let cmd = Command::new(git)
		.arg("init")
		.arg(&input.location.path)
		.stdout(Stdio::inherit())
		.stderr(Stdio::inherit())
		.status()
		.context("Failed to execute git")?;
	println!();

	if !cmd.success() {
		return Err(anyhow::anyhow!("Could not create git repository"));
	}

	Ok(())
}
