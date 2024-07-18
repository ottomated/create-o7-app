pub mod git;
pub mod install_deps;
pub mod project_features;
pub mod project_location;

use std::{collections::HashSet, path::PathBuf};

use crate::{
	telemetry,
	utils::{get_package_manager, Feature, PackageManager},
};

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
	let package_manager = get_package_manager();

	if package_manager == PackageManager::Pnpm {
		// pnpm create sometimes eats the first line of output
		println!();
	}

	telemetry::print_initial_warning();

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

	let install_deps = install_deps::prompt(&render_config, package_manager)?;

	Ok(UserInput {
		location,
		features,
		git,
		install_deps,
	})
}

pub fn warn_render_config() -> RenderConfig<'static> {
	RenderConfig {
		prompt: StyleSheet {
			att: Attributes::BOLD,
			fg: Some(Color::LightYellow),
			..Default::default()
		},
		..Default::default()
	}
}
