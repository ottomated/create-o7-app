use std::path::PathBuf;

use anyhow::Context;
use directories::ProjectDirs;

fn get_cookie_file(name: &str) -> anyhow::Result<PathBuf> {
	Ok(ProjectDirs::from("net", "Ottomated", "create-o7-app")
		.context("Could not determine app config directory")?
		.config_dir()
		.join(name))
}

pub fn get_cookie(name: &str) -> anyhow::Result<Option<String>> {
	let file =
		get_cookie_file(name).with_context(|| format!("Could not get cookie file for {name}"))?;
	if !file.exists() {
		return Ok(None);
	}
	let text = std::fs::read_to_string(file)
		.with_context(|| format!("Could not read cookie file for {name}"))?;
	Ok(Some(text))
}

pub fn get_cookie_bool(name: &str, default: bool) -> bool {
	match get_cookie(name) {
		Ok(Some(value)) if default => value != "false",
		Ok(Some(value)) if !default => value == "true",
		_ => default,
	}
}

pub fn set_cookie(name: &str, value: &str) -> anyhow::Result<()> {
	let file =
		get_cookie_file(name).with_context(|| format!("Could not get cookie file for {name}"))?;
	std::fs::create_dir_all(file.parent().unwrap())
		.with_context(|| format!("Could not create cookie directory for {name}"))?;
	std::fs::write(file, value)
		.with_context(|| format!("Could not write cookie file for {name}"))?;
	Ok(())
}
