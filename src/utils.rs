use std::collections::HashMap;
use std::env;
use std::fmt::Display;

include!(concat!(env!("OUT_DIR"), "/config.rs"));

pub enum PackageManager {
	Npm,
	Pnpm,
	Yarn,
	Bun,
}
impl Display for PackageManager {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			PackageManager::Npm => write!(f, "npm"),
			PackageManager::Pnpm => write!(f, "pnpm"),
			PackageManager::Yarn => write!(f, "yarn"),
			PackageManager::Bun => write!(f, "bun"),
		}
	}
}

pub fn get_package_manager() -> PackageManager {
	// This environment variable is set by npm and yarn but pnpm seems less consistent
	let user_agent = env::var("npm_config_user_agent");

	if user_agent.is_err() {
		return PackageManager::Npm;
	}
	let user_agent = user_agent.unwrap().to_lowercase();

	if user_agent.starts_with("yarn") {
		PackageManager::Yarn
	} else if user_agent.starts_with("pnpm") {
		PackageManager::Pnpm
	} else if user_agent.starts_with("bun") {
		PackageManager::Bun
	} else {
		PackageManager::Npm
	}
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PackageJsonPartial<'a> {
	pub name: Option<&'a str>,
	pub version: Option<&'a str>,
	pub r#type: Option<&'a str>,
	pub scripts: Option<HashMap<&'a str, Option<&'a str>>>,
	pub dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	pub dev_dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
}

impl<'a> PackageJsonPartial<'a> {
	pub fn merge(&mut self, other: PackageJsonPartial<'a>) {
		if other.name.is_some() {
			self.name = other.name;
		}
		if other.version.is_some() {
			self.version = other.version;
		}
		if other.r#type.is_some() {
			self.r#type = other.r#type;
		}
		merge_hashmaps(&mut self.scripts, other.scripts);
		merge_hashmaps(&mut self.dependencies, other.dependencies);
		merge_hashmaps(&mut self.dev_dependencies, other.dev_dependencies);
	}
}

fn merge_hashmaps<'a>(
	old: &mut Option<HashMap<&'a str, Option<&'a str>>>,
	new: Option<HashMap<&'a str, Option<&'a str>>>,
) {
	if old.is_none() {
		*old = Some(HashMap::new());
	}
	let old = old.as_mut().unwrap();
	if let Some(new) = new {
		for (key, value) in new {
			old.insert(key, value);
		}
	}
	old.retain(|_, v| v.is_some());
}
