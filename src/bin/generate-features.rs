use anyhow::Result;
use create_o7_app::utils::generate_combinations;

fn main() -> Result<()> {
	let features = generate_combinations();

	println!(
		"features=[{}]",
		features
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
