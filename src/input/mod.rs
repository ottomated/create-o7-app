mod git;
pub mod install_deps;
pub mod project_features;
mod project_location;

use std::{collections::HashSet, path::PathBuf};

use crate::utils::Feature;

use self::{install_deps::ProjectPackageManager, project_location::ProjectLocation};
use anyhow::Result;
use inquire::ui::{Attributes, Color, RenderConfig, StyleSheet};

#[derive(Debug)]
pub struct UserInput {
	pub location: ProjectLocation,
	pub features: HashSet<Feature>,
	pub git: Option<PathBuf>,
	pub install_deps: Option<ProjectPackageManager>,
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

	let git = git::prompt(&render_config, &location)?;

	let install_deps = install_deps::prompt(&render_config)?;

	Ok(UserInput {
		location,
		features,
		git,
		install_deps,
	})
}

pub fn warn_render_config() -> RenderConfig {
	RenderConfig {
		prompt: StyleSheet {
			att: Attributes::BOLD,
			fg: Some(Color::LightYellow),
			..Default::default()
		},
		..Default::default()
	}
}
