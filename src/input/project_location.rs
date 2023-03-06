use std::{
	ffi::OsStr,
	fs,
	path::PathBuf,
};

use crate::utils::DEFAULT_NAME;
use anyhow::Result;
use dunce::canonicalize;
use inquire::{ui::RenderConfig, validator::Validation, Confirm, Text};

use super::warn_render_config;

#[derive(Debug)]
pub struct ProjectLocation {
	pub name: String,
	pub path: PathBuf,
}

fn get_file_name(path: &PathBuf) -> String {
	path.file_name()
		.unwrap_or(OsStr::new(path))
		.to_string_lossy()
		.to_string()
}

fn get_project_name(input: &str) -> Result<ProjectLocation> {
	let input_path = PathBuf::from(input);

	let path = if input_path.exists() {
		canonicalize(input_path)?
	} else {
		fs::create_dir(&input_path)?;
		let res = canonicalize(&input_path);
		fs::remove_dir(input_path)?;
		res?
	};
	let file_name = get_file_name(&path);
	if path.is_file() {
		return Err(anyhow::anyhow!("{} is a file that exists", file_name));
	}
	Ok(ProjectLocation {
		name: file_name,
		path,
	})
}

pub fn prompt(render_config: &RenderConfig) -> Result<ProjectLocation> {
	let name = Text::new("Where should we create your project?")
		.with_default(DEFAULT_NAME)
		.with_render_config(*render_config)
		.with_validator(|text: &str| {
			let location = get_project_name(text);
			match location {
				Ok(location) => {
					if location
						.name
						.chars()
						.all(|char| VALID_CHARS.contains(&char))
					{
						Ok(Validation::Valid)
					} else {
						Ok(Validation::Invalid(
							format!("Project name ({}) must only contain lowercase alphanumeric characters, dashes, and underscores", location.name).into(),
						))
					}
				}
				Err(err) => Ok(Validation::Invalid(err.into())),
			}
		})
		.prompt()?;

	let location = get_project_name(&name)?;
	if location.path.exists() {
		let file_count = location.path.read_dir()?.count();
		if file_count > 0 {
			let should_continue = Confirm::new(
				"That location is not empty. Would you like to empty it and continue?",
			)
			.with_render_config(warn_render_config())
			.with_default(false)
			.with_help_message(&format!(
				"{} has {} file{}.",
				location.path.to_string_lossy(),
				file_count,
				if file_count == 1 { "" } else { "s" }
			))
			.prompt()?;
			if !should_continue {
				return prompt(render_config);
			}
		}
	}

	Ok(location)
}

const VALID_CHARS: &[char] = &[
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
	't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_',
];
