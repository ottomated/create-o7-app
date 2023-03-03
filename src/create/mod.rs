mod git;
mod install_deps;
mod next_steps;
mod package_json;
mod scaffold;

use crate::{
	create::{git::create_repo, install_deps::install_deps, package_json::create_package_json},
	input::UserInput,
};
use anyhow::{Context, Result};
use crossterm::style::{style, Stylize};
use human_repr::HumanDuration;
use std::{fs, time::Instant};

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

	println!();
	// Scaffold (copy files)
	let start = log_step_start("Copying template...");
	scaffold(&input)?;
	log_step_end(start);

	let start = log_step_start("Creating package.json...");
	create_package_json(&input)?;
	log_step_end(start);

	create_repo(&input)?;

	install_deps(&input)?;

	next_steps::print(&input);

	Ok(())
}

pub fn log_step_start(step: &str) -> Instant {
	let logo = style("{O}").dark_magenta().bold();
	let step = style(step).magenta();
	println!("{logo} {step}");

	Instant::now()
}

pub fn log_step_end(start: Instant) {
	let end = style(format!(
		"✔  Finished in {}\n",
		start.elapsed().human_duration()
	))
	.green();
	println!("{end}");
}
