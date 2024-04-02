use std::collections::HashSet;

use crate::utils::{get_feature_list, Feature, FeatureDetails};
use anyhow::Result;
use crossterm::style::{style, Stylize};
use inquire::{ui::RenderConfig, Confirm, Select};

pub fn prompt(_render_config: &RenderConfig) -> Result<HashSet<Feature>> {
	println!(
		"{} {}",
		style(">").green(),
		style("Which features would you like to enable?").bold()
	);
	let mut selected_features = HashSet::new();
	let feature_list = get_feature_list();

	for feature in feature_list.into_iter() {
		match feature {
			FeatureDetails::Boolean(ref details) => {
				let (should_show, default_value) = details.should_show(&selected_features);
				if !should_show {
					if default_value {
						println!(
							"{} {} {}",
							style(">").green(),
							feature,
							style("Yes, Required").yellow()
						);
						selected_features.insert(details.feature);
					}
					continue;
				}

				let yes = Confirm::new(&format!("{feature}"))
					.with_default(default_value)
					.prompt()?;
				if yes {
					selected_features.insert(details.feature);
				}
			}
			FeatureDetails::Option(ref details) => {
				let possible_options = details
					.options
					.iter()
					.filter(|option| option.should_show(&selected_features))
					.collect();
				let option = Select::new(&format!("{feature}"), possible_options).prompt()?;

				if let Some(feature) = option.feature {
					selected_features.insert(feature);
				}
			}
		}
	}

	Ok(selected_features)
}
