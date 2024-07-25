use std::{collections::HashSet, fmt};

use anyhow::Result;
use create_o7_app::utils::{get_feature_list, Feature, FeatureDetails};

use serde::Serialize;

fn main() -> Result<()> {
	let features = get_feature_list();
	let mut last_step = vec![HashSet::new()];

	for i in 0..features.len() {
		let feature_details = features.get(i).unwrap();
		let mut next = vec![];
		for past in last_step {
			match feature_details {
				FeatureDetails::Boolean(details) => {
					let (show, value) = details.should_show(&past);
					if !show {
						let mut set = past.clone();
						if value {
							set.insert(details.feature);
						}
						next.push(set);
					} else {
						let mut yes = past.clone();
						yes.insert(details.feature);
						let no = past;
						next.push(yes);
						next.push(no);
					}
				}
				FeatureDetails::Option(details) => {
					let show = details.should_show(&past);
					if !show {
						next.push(past);
						continue;
					}
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

	println!(
		"features=[{}]",
		last_step
			.iter()
			.map(|hashset| format!(
				"\"{}\"",
				hashset
					.into_iter()
					.map(|item| format!("{:?}", item))
					.collect::<Vec<_>>()
					.join(",")
			))
			.filter(|s| s != "\"\"")
			.collect::<Vec<_>>()
			.join(",")
	);

	Ok(())
}
