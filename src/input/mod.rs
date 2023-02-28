mod install_deps;
pub mod project_features;
mod project_location;

use std::{collections::HashSet, path::PathBuf};

use crate::utils::Feature;

use self::project_location::ProjectLocation;
use anyhow::Result;
use crossterm::style::{style, Stylize};
use inquire::{
	ui::{Attributes, RenderConfig, StyleSheet},
	Confirm,
};

#[derive(Debug)]
pub struct UserInput {
	pub location: ProjectLocation,
	pub features: HashSet<Feature>,
	pub git: Option<PathBuf>,
	pub install_deps: bool,
}

pub fn prompt() -> Result<UserInput> {
	let render_config = RenderConfig {
		prompt: StyleSheet {
			att: Attributes::BOLD,
			..Default::default()
		},
		..Default::default()
	};
	let location = project_location::prompt(&render_config)?;

	let features = project_features::prompt(&render_config)?;

	let git_path = which::which("git");
	let git = match git_path {
		Ok(git_path) => {
			let git = Confirm::new("Initialize a new git repository?")
				.with_render_config(render_config)
				.with_default(true)
				.prompt()?;
			if git {
				Some(git_path)
			} else {
				None
			}
		}
		Err(e) => {
			let warn = style("!").red();
			let message = style(format!(
				"Git not found - https://github.com/git-guides/install-git"
			))
			.yellow()
			.bold();
			println!("{warn} {message}");
			println!(
				"  {}",
				style("(git is optional, but recommended)").yellow().dim()
			);
			None
		}
	};

	let install_deps = install_deps::prompt(&render_config)?;

	Ok(UserInput {
		location,
		features,
		git,
		install_deps,
	})
}
