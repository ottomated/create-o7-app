use std::collections::HashSet;

use crate::utils::{get_feature_list, Feature, DEFAULT_FEATURES};
use anyhow::Result;
use inquire::{ui::RenderConfig, MultiSelect};

pub fn prompt(render_config: &RenderConfig) -> Result<HashSet<Feature>> {
	let feature_list = get_feature_list();

	let features = MultiSelect::new("Which features would you like to enable?", feature_list)
		.with_render_config(*render_config)
		.with_default(DEFAULT_FEATURES)
		.prompt()?;

	let features = features
		.into_iter()
		.map(|feature| feature.feature)
		.collect();

	Ok(features)
}
