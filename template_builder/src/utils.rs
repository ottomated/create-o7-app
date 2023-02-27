use std::{
	collections::HashSet,
	path::{Path, PathBuf},
};

use walkdir::WalkDir;

pub fn parse_feature_file(file_name: &str) -> Option<(HashSet<String>, &str)> {
	let open = file_name.find('{')?;
	if open != 0 {
		return None;
	}
	let close = file_name.find('}')?;

	let features_string = &file_name[open + 1..close];

	let features = features_string.split(',').map(|f| f.to_string()).collect();

	let file_name = &file_name[close + 1..];
	Some((features, file_name))
}

pub fn walk_dir(dir: &Path) -> Vec<(PathBuf, walkdir::DirEntry)> {
	WalkDir::new(dir)
		.into_iter()
		.map(|e| e.expect("Could not read template"))
		.filter(|e| e.file_type().is_file())
		.map(|e| {
			(
				e.path()
					.strip_prefix(dir)
					.expect("Could not get relative path")
					.to_owned(),
				e,
			)
		})
		.collect()
}
