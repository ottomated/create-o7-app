mod git;
mod package_json;
mod scaffold;

use crate::{
	create::{git::create_repo, package_json::create_package_json},
	input::UserInput,
};
use anyhow::{Context, Result};
use std::fs;

use self::scaffold::scaffold;

mod templates {
	include!(concat!(env!("OUT_DIR"), "/templates.rs"));
}

pub fn create(input: UserInput) -> Result<()> {
	// Ensure the project directory is empty
	if input.location.path.exists() {
		fs::remove_dir_all(&input.location.path).context("Could not clear project directory")?;
	}
	fs::create_dir_all(&input.location.path).context("Could not create project directory")?;

	// Scaffold (copy files)
	println!("\nScaffolding...");
	scaffold(&input)?;

	create_package_json(&input)?;

	create_repo(&input)?;

	install_deps(&input)?;

	Ok(())
}
