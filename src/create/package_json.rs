use super::templates;
use crate::input::UserInput;
use anyhow::{Context, Result};
use serde::Serialize;
use serde_json::{ser::PrettyFormatter, Serializer};
use std::fs;

pub fn create_package_json(input: &UserInput) -> Result<()> {
	let (base, extras) = templates::get_package_jsons();
	let mut package_json = base.contents;

	for extra in extras {
		let included = match &extra.features {
			Some(features) => features.is_subset(&input.features),
			None => true,
		};
		if !included {
			continue;
		}
		package_json.merge(extra.contents);
	}

	package_json.name = Some(&input.location.name);

	let target_path = &input.location.path.join("package.json");
	let formatter = PrettyFormatter::with_indent(b"\t");
	let buf = Vec::new();
	let mut ser = Serializer::with_formatter(buf, formatter);
	package_json
		.serialize(&mut ser)
		.context("Failed to serialize package.json")?;

	fs::write(target_path, ser.into_inner())?;

	Ok(())
}
