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
		let included = extra.features.is_subset(&input.features);
		if !included {
			continue;
		}
		package_json.merge(extra.contents);
	}

	package_json.name = Some(&input.location.name);

	package_json.package_manager = input.install_deps.as_ref().and_then(|p| p.version_string());

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
