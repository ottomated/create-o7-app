mod common;

use std::cmp::min;
use std::num::NonZeroUsize;
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::{Arc, RwLock};
use std::thread::available_parallelism;
use std::time::Duration;
use std::{panic, thread};

use common::run_feature;
use create_o7_app::utils::generate_combinations;
use itertools::Itertools;

#[test]
fn run_all() {
	let mut combinations = generate_combinations();
	// let mut combinations = vec![HashSet::new()];
	// combinations[0].insert(Feature::Edge);
	// combinations[0].insert(Feature::D1);
	// combinations[0].insert(Feature::Trpc);

	let num_threads = min(
		{
			let possible =
				usize::from(available_parallelism().unwrap_or(NonZeroUsize::new(1).unwrap()));

			if std::env::var("CI").is_ok() {
				if possible == 1 {
					1usize
				} else {
					possible - 1
				}
			} else {
				possible / 2
			}
		},
		combinations.len(),
	);

	println!(
		"Testing {} combinations on {num_threads} threads",
		combinations.len()
	);

	let mut chunks = vec![vec![]; num_threads];
	while !combinations.is_empty() {
		#[allow(clippy::needless_range_loop)]
		for i in 0..num_threads {
			let Some(c) = combinations.pop() else {
				break;
			};
			chunks[i].push(c);
		}
	}

	thread::scope(|s| {
		let errors = Arc::new(RwLock::new(vec![]));
		let thread_count = Arc::new(AtomicU16::new(0));

		for chunk in chunks {
			thread_count.fetch_add(1, Ordering::SeqCst);
			let errors = Arc::clone(&errors);
			let thread_count = Arc::clone(&thread_count);

			s.spawn(move || {
				for features in chunk {
					let result = run_feature(features.clone());
					if let Err(e) = result {
						errors.write().unwrap().push((features.clone(), e));
					}
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
