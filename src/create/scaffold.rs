use super::templates;
use crate::input::UserInput;
use anyhow::{Context, Result};
use std::fs;

const REPLACABLE_EXTENSIONS: [&str; 2] = ["html", "toml"];
const NAME_PLACEHOLDER: &[u8] = b"__o7__name__";

pub fn scaffold(input: &UserInput) -> Result<()> {
	let templates = templates::get_templates();

	let name_replacement = input.location.name.as_bytes();

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

		let extension = target_path.extension().and_then(|e| e.to_str());

		let contents = match extension {
			Some(ext) if REPLACABLE_EXTENSIONS.contains(&ext) => {
				let mut result = template.contents.to_vec();

				if let Some(pos) = template
					.contents
					.windows(NAME_PLACEHOLDER.len())
					.position(|window| window == NAME_PLACEHOLDER)
				{
					result.splice(
						pos..pos + NAME_PLACEHOLDER.len(),
						name_replacement.iter().cloned(),
					);
				}

				result
			}
			_ => template.contents.to_vec(),
		};
		fs::write(target_path, contents)
			.with_context(|| format!("Could not write {}", template.path))?;
	}

	Ok(())
}
