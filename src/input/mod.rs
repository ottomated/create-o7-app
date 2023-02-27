mod install_deps;
pub mod project_features;
mod project_location;

use std::collections::HashSet;

use crate::utils::Feature;

use self::project_location::ProjectLocation;
use anyhow::Result;
use inquire::{
	ui::{Attributes, RenderConfig, StyleSheet},
	Confirm,
};

#[derive(Debug)]
pub struct UserInput {
	pub location: ProjectLocation,
	pub features: HashSet<Feature>,
	pub git: bool,
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

	let git = Confirm::new("Initialize a new git repository?")
		.with_render_config(render_config)
		.with_help_message("yo")
		.with_default(true)
		.prompt()?;

	let install_deps = install_deps::prompt(&render_config)?;

	Ok(UserInput {
		location,
		features,
		git,
		install_deps,
	})
}
