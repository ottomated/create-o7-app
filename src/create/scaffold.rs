use super::templates;
use crate::input::UserInput;
use anyhow::{Context, Result};
use std::fs;

pub fn scaffold(input: &UserInput) -> Result<()> {
	let templates = templates::get_templates();

	for template in templates {
		let included = match template.features {
			Some(features) => features.is_subset(&input.features),
			None => true,
		};
		if !included {
			continue;
		}
		let target_path = input.location.path.join(&template.path);
		let folder = target_path.parent();
		if let Some(folder) = folder {
			fs::create_dir_all(folder)
				.with_context(|| format!("Could not create {}", folder.display()))?;
		}
		fs::write(target_path, template.contents)
			.with_context(|| format!("Could not write {}", template.path))?;
	}

	Ok(())
}
