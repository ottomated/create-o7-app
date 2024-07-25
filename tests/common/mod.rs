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
use create_o7_app::input::{project_location::ProjectLocation, UserInput};
use create_o7_app::utils::{get_feature_list, Feature, FeatureDetails};
use itertools::Itertools;

fn make_input(features: HashSet<Feature>) -> UserInput {
	let tmp = tempfile::tempdir().unwrap();
	UserInput {
		location: ProjectLocation {
			name: "o7-test".to_string(),
			path: tmp.path().join("o7-test"),
		},
		features,
		install_deps: None,
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

// fn run_all() {
// 	let mut combinations = generate_combinations(get_feature_list());
// 	// let mut combinations = vec![HashSet::new()];
// 	// combinations[0].insert(Feature::Edge);
// 	// combinations[0].insert(Feature::D1);
// 	// combinations[0].insert(Feature::Trpc);

// 	let num_threads = min(
// 		{
// 			let possible =
// 				usize::from(available_parallelism().unwrap_or(NonZeroUsize::new(1).unwrap()));

// 			if std::env::var("CI").is_ok() {
// 				if possible == 1 {
// 					1usize
// 				} else {
// 					possible - 1
// 				}
// 			} else {
// 				possible / 2
// 			}
// 		},
// 		combinations.len(),
// 	);

// 	println!(
// 		"Testing {} combinations on {num_threads} threads",
// 		combinations.len()
// 	);

// 	let mut chunks = vec![vec![]; num_threads];
// 	while !combinations.is_empty() {
// 		#[allow(clippy::needless_range_loop)]
// 		for i in 0..num_threads {
// 			let Some(c) = combinations.pop() else {
// 				break;
// 			};
// 			chunks[i].push(c);
// 		}
// 	}

// 	thread::scope(|s| {
// 		let errors = Arc::new(RwLock::new(vec![]));
// 		let thread_count = Arc::new(AtomicU16::new(0));

// 		for chunk in chunks {
// 			thread_count.fetch_add(1, Ordering::SeqCst);
// 			let errors = Arc::clone(&errors);
// 			let thread_count = Arc::clone(&thread_count);

// 			s.spawn(move || {
// 				for features in chunk {
// 					let result = run_feature(features.clone());
// 					if let Err(e) = result {
// 						errors.write().unwrap().push((features.clone(), e));
// 					}
// 				}
// 				thread_count.fetch_sub(1, Ordering::SeqCst);
// 			});
// 		}
// 		while thread_count.load(Ordering::SeqCst) > 0 {
// 			thread::sleep(Duration::from_millis(1));
// 		}
// 		let errors = errors.read().unwrap();
// 		if !errors.is_empty() {
// 			panic!(
// 				"{} errors occurred:\n\n{}",
// 				errors.len(),
// 				errors
// 					.iter()
// 					.map(|(features, e)| {
// 						format!("Error with features {:?}:\n\n{}\n\n", features, e)
// 					})
// 					.join("\n")
// 			);
// 		}
// 	});
// }

pub fn run_feature(features: HashSet<Feature>) -> Result<(), String> {
	let input = make_input(features);
	println!("input: {:?}", input);

	let dir = input.location.path.clone();
	let result: Result<(), String> = (|| {
		create(input).map_err(|e| format!("{e}"))?;
		// Build first so sveltekit generates its tsconfig
		test_pnpm(&dir, &["install"])?;
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
