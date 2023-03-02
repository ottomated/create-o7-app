mod git;
mod install_deps;
pub mod project_features;
mod project_location;

use std::{collections::HashSet, path::PathBuf};

use crate::utils::Feature;

use self::project_location::ProjectLocation;
use anyhow::Result;
use inquire::ui::{Attributes, RenderConfig, StyleSheet};

#[derive(Debug)]
pub struct UserInput {
	pub location: ProjectLocation,
	pub features: HashSet<Feature>,
	pub git: Option<PathBuf>,
	pub install_deps: Option<PathBuf>,
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

	let git = git::prompt(&render_config)?;

	let install_deps = install_deps::prompt(&render_config)?;

	Ok(UserInput {
		location,
		features,
		git,
		install_deps,
	})
}
