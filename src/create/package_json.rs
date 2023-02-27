use crate::{input::UserInput, utils::Feature};
use anyhow::Result;
use std::{collections::HashMap, fs};

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PackageJson<'a> {
	name: &'a str,
	version: &'a str,
	r#type: &'a str,
	scripts: HashMap<&'a str, &'a str>,
	dependencies: HashMap<&'a str, &'a str>,
	dev_dependencies: HashMap<&'a str, &'a str>,
}

pub fn create_package_json(input: &UserInput) -> Result<()> {
	let mut package_json = PackageJson {
		name: &input.location.name,
		version: "0.1.0",
		r#type: "module",
		scripts: HashMap::new(),
		dependencies: HashMap::new(),
		dev_dependencies: HashMap::new(),
	};

	package_json.scripts.insert("dev", "vite dev");
	package_json.scripts.insert("build", "vite build");
	package_json.scripts.insert("preview", "vite preview");
	package_json
		.scripts
		.insert("lint", "eslint --fix . && svelte-check");

	if input.features.contains(&Feature::Database) {
		package_json.scripts.insert("db:push", "prisma db push");
	}

	let target_path = &input.location.path.join("package.json");
	fs::write(target_path, serde_json::to_string_pretty(&package_json)?)?;

	Ok(())
}
