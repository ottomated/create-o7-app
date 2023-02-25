mod input;
mod utils;

use std::fs;

use anyhow::{Context, Result};

fn main() -> Result<()> {
	let input = input::prompt()?;
	println!("{:?}", input);

	if input.location.path.exists() {
		fs::remove_dir_all(&input.location.path).context("Could not clear project directory")?;
	}
	fs::create_dir_all(&input.location.path).context("Could not create project directory")?;

	Ok(())
}
