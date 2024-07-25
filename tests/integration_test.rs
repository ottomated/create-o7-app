mod common;

use std::collections::HashSet;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::Path;
use std::str::FromStr;

use common::run_feature;
use create_o7_app::utils::Feature;

fn read_comma_separated_strings<P>(filename: P) -> io::Result<Vec<String>>
where
	P: AsRef<Path>,
{
	let file = File::open(filename)?;
	let mut reader = BufReader::new(file);
	let mut line = String::new();

	// Read the first line
	reader.read_line(&mut line)?;

	// Split the line by commas and collect into a Vec<String>
	let strings = line
		.trim()
		.split(',')
		.map(|s| s.trim().to_string())
		.collect();

	Ok(strings)
}

#[test]
fn integration_test() {
	let mut features = HashSet::new();

	let filename = "features.txt";
	let strings = read_comma_separated_strings(filename).unwrap();

	for string in &strings {
		let feature = Feature::from_str(string.as_str()).unwrap();
		features.insert(feature);
	}
	println!("Testing with: {:?}", features);

	run_feature(features).unwrap();
}
