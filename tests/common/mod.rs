use std::cmp::min;
use std::collections::HashSet;
use std::num::NonZeroUsize;
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::{Arc, RwLock};
use std::thread::available_parallelism;
use std::time::Duration;
use std::{fs, panic, thread};

use create_o7_app::create::create;
use create_o7_app::input::install_deps::ProjectPackageManager;
use create_o7_app::input::{project_location::ProjectLocation, UserInput};
use create_o7_app::utils::{get_feature_list, Feature, FeatureDetails, PackageManager};
use itertools::Itertools;

fn make_input(features: HashSet<Feature>) -> UserInput {
	let tmp = tempfile::tempdir().unwrap();
	UserInput {
		location: ProjectLocation {
			name: "o7-test".to_string(),
			path: tmp.path().join("o7-test"),
		},
		features,
		install_deps: Some(ProjectPackageManager {
			package_manager: PackageManager::Pnpm,
			exec_path: which::which("pnpm").unwrap(),
		}),
		git: None,
	}
}

fn test_pnpm(dir: &PathBuf, args: &[&'static str]) -> Result<Output, String> {
	let output = Command::new("pnpm")
		.args(args)
		.current_dir(dir)
		.output()
		.unwrap();
	if !output.status.success() {
		return Err(format!(
			"pnpm {} failed with stdout:\n\n{}\n\nstderr: {}",
			args.join(" "),
			String::from_utf8_lossy(&output.stdout),
			String::from_utf8_lossy(&output.stderr)
		));
	}

	Ok(output)
}

pub fn run_feature(features: HashSet<Feature>) -> Result<(), String> {
	let input = make_input(features);

	let dir = input.location.path.clone();
	let result: Result<(), String> = (|| {
		create(input).map_err(|e| format!("{e}"))?;
		// Build first so sveltekit generates its tsconfig
		test_pnpm(&dir, &["build"])?;
		test_pnpm(&dir, &["eslint", "--max-warnings", "0", "."])?;
		test_pnpm(&dir, &["svelte-check"])?;

		Ok(())
	})();
	if let Err(e) = result {
		Err(e)
	} else {
		let _ = fs::remove_dir_all(&dir);
		Ok(())
	}
}
