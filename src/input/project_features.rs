use std::collections::HashSet;

use anyhow::Result;
use inquire::{ui::RenderConfig, MultiSelect};

#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
pub enum Feature {
	Trpc,
	Tailwind,
	Database,
	Edge,
}

pub fn prompt(render_config: &RenderConfig) -> Result<HashSet<Feature>> {
	let feature_name_map = vec![
		("tRPC", Feature::Trpc),
		("Tailwind", Feature::Tailwind),
		("Database (Prisma + Kysely)", Feature::Database),
		("Edge (Cloudflare Workers + Planetscale)", Feature::Edge),
	];

	let features = MultiSelect::new(
		"Which features would you like to enable?",
		feature_name_map.iter().map(|feature| feature.0).collect(),
	)
	.with_render_config(*render_config)
	.with_default(&[0, 1])
	.prompt()?;

	let features = features
		.into_iter()
		.map(|str| {
			feature_name_map
				.iter()
				.find(|feature| feature.0 == str)
				.unwrap()
				.1
		})
		.collect();

	Ok(features)
}
