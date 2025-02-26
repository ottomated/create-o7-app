use super::templates;
use crate::input::UserInput;
use anyhow::{Context, Result};
use std::{collections::HashSet, fs};

const REPLACABLE_EXTENSIONS: [&str; 3] = ["html", "json", "jsonc"];
const NAME_PLACEHOLDER: &[u8] = b"__o7__name__";

pub fn scaffold(input: &UserInput) -> Result<()> {
	let templates = templates::get_templates();

	let name_replacement = input.location.name.as_bytes();

	let files_to_delete: HashSet<_> = templates
		.iter()
		.filter(|t| t.is_delete && t.features.is_subset(&input.features))
		.map(|t| t.path)
		.collect();

	for template in templates {
		if files_to_delete.contains(&template.path) {
			continue;
		}
		let included = template.features.is_subset(&input.features);
		if !included {
			continue;
		}

		let target_path = input.location.path.join(template.path);
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
