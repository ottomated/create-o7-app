use std::collections::{HashMap, HashSet};

use crate::utils::{get_feature_name_map, Feature, DEFAULT_FEATURES};
use anyhow::Result;
use crossterm::style::{style, Stylize};
use inquire::{ui::RenderConfig, MultiSelect};

pub fn prompt(render_config: &RenderConfig) -> Result<HashSet<Feature>> {
	let feature_name_map = get_feature_name_map();

	let feature_list = feature_name_map
		.into_iter()
		.map(|feature| {
			(
				format!("{} {}", feature.name, style(feature.description).dim()),
				feature,
			)
		})
		.collect::<Vec<_>>();

	let feature_map = feature_list
		.iter()
		.map(|(name, feature)| (name, feature))
		.collect::<HashMap<_, _>>();

	let features = MultiSelect::new(
		"Which features would you like to enable?",
		feature_list.iter().map(|(name, _)| name).collect(),
	)
	.with_render_config(*render_config)
	.with_formatter(&|options| {
		options
			.iter()
			.map(|option| feature_map[*option.value].name)
			.collect::<Vec<_>>()
			.join(", ")
	})
	.with_default(DEFAULT_FEATURES)
	.prompt()?;

	let features = features
		.into_iter()
		.map(|feature| feature_map[feature].feature)
		.collect();

	Ok(features)
}
