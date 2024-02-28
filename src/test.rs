use std::collections::HashSet;
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use std::{fs, panic, thread};

use itertools::Itertools;

use crate::utils::{get_feature_list, Feature, FeatureDetails};
use crate::{
	create::create,
	input::{install_deps::ProjectPackageManager, project_location::ProjectLocation, UserInput},
	utils::PackageManager,
};

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
			args.iter().join(" "),
			String::from_utf8_lossy(&output.stdout),
			String::from_utf8_lossy(&output.stderr)
		));
	}

	Ok(output)
}

fn generate_combinations(features: Vec<FeatureDetails>) -> Vec<HashSet<Feature>> {
	let mut last_step = vec![HashSet::new()];

	for i in 0..features.len() {
		let feature_details = features.get(i).unwrap();
		let mut next = vec![];
		for past in last_step {
			match feature_details {
				FeatureDetails::Boolean(details) => {
					let mut yes = past.clone();
					yes.insert(details.feature);
					let no = past;
					next.push(yes);
					next.push(no);
				}
				FeatureDetails::Option(details) => {
					for option in details.options.iter() {
						if !option.should_show(&past) {
							continue;
						}
						let mut set = past.clone();
						if let Some(feature) = option.feature {
							set.insert(feature);
						}
						next.push(set);
					}
				}
			}
		}
		last_step = next;
	}
	last_step
}

#[test]
fn test() {
	let combinations = generate_combinations(get_feature_list());
	// let mut combinations = vec![HashSet::new()];
	// combinations[0].insert(Feature::Edge);
	// combinations[0].insert(Feature::D1);
	// combinations[0].insert(Feature::Trpc);

	println!("Testing {} combinations", combinations.len());

	thread::scope(|s| {
		let errors = Arc::new(RwLock::new(vec![]));
		let thread_count = Arc::new(AtomicU16::new(0));

		for features in combinations {
			thread_count.fetch_add(1, Ordering::SeqCst);
			let input = make_input(features.clone());
			let errors = Arc::clone(&errors);
			let thread_count = thread_count.clone();

			s.spawn(move || {
				let dir = input.location.path.clone();
				let result: Result<(), String> = (|| {
					create(input).map_err(|e| format!("{e}"))?;
					test_pnpm(&dir, &["build"])?;
					test_pnpm(&dir, &["eslint", "--max-warnings", "0", "."])?;
					test_pnpm(&dir, &["svelte-check"])?;

					Ok(())
				})();
				if let Err(e) = result {
					errors.write().unwrap().push((features, e));
				} else {
					let _ = fs::remove_dir_all(&dir);
				}
				thread_count.fetch_sub(1, Ordering::SeqCst);
			});
		}
		while thread_count.load(Ordering::SeqCst) > 0 {
			thread::sleep(Duration::from_millis(1));
		}
		let errors = errors.read().unwrap();
		if !errors.is_empty() {
			panic!(
				"{} errors occurred:\n\n{}",
				errors.len(),
				errors
					.iter()
					.map(|(features, e)| {
						format!("Error with features {:?}:\n\n{}\n\n", features, e)
					})
					.join("\n")
			);
		}
	});
}
