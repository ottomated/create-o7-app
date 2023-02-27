mod package_json;
mod scaffold;

use crate::{create::package_json::create_package_json, input::UserInput};
use anyhow::{Context, Result};
use std::fs;

use self::scaffold::scaffold;

pub fn create(input: UserInput) -> Result<()> {
	// Ensure the project directory is empty
	if input.location.path.exists() {
		fs::remove_dir_all(&input.location.path).context("Could not clear project directory")?;
	}
	fs::create_dir_all(&input.location.path).context("Could not create project directory")?;

	// Scaffold (copy files)
	println!("Copying files...");
	scaffold(&input)?;

	println!("Creating package.json");
	create_package_json(&input)?;

	Ok(())
}
