use super::templates;
use crate::input::UserInput;
use anyhow::{Context, Result};
use serde::Serialize;
use serde_json::{ser::PrettyFormatter, Serializer};
use std::fs;

pub fn create_package_json(input: &UserInput) -> Result<()> {
	let (mut base, extras) = templates::get_package_jsons();

	for package_json in extras {
		let included = match &package_json.features {
			Some(features) => features.is_subset(&input.features),
			None => true,
		};
		if !included {
			continue;
		}
		base.contents.merge(package_json.contents);
	}

	base.contents.name = Some(&input.location.name);

	let target_path = &input.location.path.join("package.json");
	let formatter = PrettyFormatter::with_indent(b"\t");
	let buf = Vec::new();
	let mut ser = Serializer::with_formatter(buf, formatter);
	base.contents
		.serialize(&mut ser)
		.context("Failed to serialize package.json")?;

	fs::write(target_path, ser.into_inner())?;

	Ok(())
}
