use std::collections::{BTreeMap, HashMap};
use std::env;
use std::fmt::Display;
use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::{Serialize, Serializer};

include!(concat!(env!("OUT_DIR"), "/config.rs"));

#[derive(Debug, Clone, Eq, PartialEq, clap::ValueEnum, serde::Serialize)]
pub enum PackageManager {
	Npm,
	Pnpm,
	Yarn,
	Bun,
}

impl PackageManager {
	pub fn run_script(&self, script: &str) -> String {
		match self {
			PackageManager::Npm => format!("npm run {script}"),
			PackageManager::Pnpm => format!("pnpm {script}"),
			PackageManager::Yarn => format!("yarn {script}"),
			PackageManager::Bun => format!("bun run {script}"),
		}
	}
	pub fn to_feature(&self) -> Feature {
		match self {
			PackageManager::Npm => Feature::Npm,
			PackageManager::Pnpm => Feature::Pnpm,
			PackageManager::Yarn => Feature::Yarn,
			PackageManager::Bun => Feature::Bun,
		}
	}
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

pub static PACKAGE_MANAGER_OVERRIDE: Lazy<Mutex<Option<PackageManager>>> =
	Lazy::new(|| Mutex::new(None));

pub fn get_package_manager() -> PackageManager {
	if let Some(package_manager) = PACKAGE_MANAGER_OVERRIDE.lock().unwrap().as_ref() {
		return package_manager.clone();
	}
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
	#[serde(skip_serializing_if = "Option::is_none")]
	pub workspaces: Option<Vec<&'a str>>,
	#[serde(serialize_with = "sorted_map", skip_serializing_if = "skip_if_empty")]
	pub dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	#[serde(serialize_with = "sorted_map", skip_serializing_if = "skip_if_empty")]
	pub dev_dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	pub package_manager: Option<String>,
}

pub fn skip_if_empty(map: &Option<HashMap<&str, Option<&str>>>) -> bool {
	match map {
		Some(map) => map.is_empty(),
		None => true,
	}
}

fn sorted_map<S: Serializer>(
	map: &Option<HashMap<&str, Option<&str>>>,
	serializer: S,
) -> Result<S::Ok, S::Error> {
	// SAFETY: this should be skipped if empty already
	let map = map.as_ref().unwrap();
	let mut items: Vec<_> = map.iter().collect();
	items.sort_by(|a, b| a.0.cmp(b.0));
	BTreeMap::from_iter(items).serialize(serializer)
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
		if other.workspaces.is_some() {
			self.workspaces = other.workspaces;
		}
		if other.package_manager.is_some() {
			self.package_manager = other.package_manager;
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
