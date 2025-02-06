use itertools::Itertools;
use proc_macro2::TokenStream;
use quote::{quote, ToTokens};
use std::{
	collections::{HashMap, HashSet},
	path::{Path, PathBuf},
};
use walkdir::WalkDir;

pub fn parse_feature_file(file_name: &str) -> Option<(Vec<HashSet<String>>, bool, &str)> {
	let open = file_name.find('{')?;
	if open != 0 {
		return None;
	}
	let close = file_name.find('}')?;

	let features_string = &file_name[open + 1..close];

	let mut base_features = HashSet::new();
	let mut or_features = Vec::new();

	for feature in features_string.split(',') {
		if feature.contains('|') {
			let or_feature = feature
				.split('|')
				.map(|f| f.to_owned())
				.collect::<HashSet<_>>();
			or_features.push(or_feature);
		} else {
			base_features.insert(feature.to_owned());
		}
	}
	let feature_sets = if or_features.is_empty() {
		vec![base_features]
	} else {
		or_features
			.iter()
			.multi_cartesian_product()
			.map(|features| {
				let mut set = base_features.clone();
				set.extend(features.into_iter().cloned());
				set
			})
			.collect::<Vec<_>>()
	};

	let rest = &file_name[close + 1..];

	let (file_name, is_delete) = match rest.strip_prefix("DELETE:") {
		Some(rest) => (rest, true),
		None => (rest, false),
	};

	Some((feature_sets, is_delete, file_name))
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageJsonPartial<'a> {
	name: Option<&'a str>,
	version: Option<&'a str>,
	r#type: Option<&'a str>,
	scripts: Option<HashMap<&'a str, Option<&'a str>>>,
	dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	dev_dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	workspaces: Option<Vec<&'a str>>,
}

impl ToTokens for PackageJsonPartial<'_> {
	fn to_tokens(&self, tokens: &mut TokenStream) {
		let mut pieces = vec![];
		match self.name {
			Some(name) => pieces.push(quote! { name: Some(#name) }),
			None => pieces.push(quote! { name: None }),
		}
		match self.version {
			Some(version) => pieces.push(quote! { version: Some(#version) }),
			None => pieces.push(quote! { version: None }),
		}
		match self.r#type {
			Some(_type) => pieces.push(quote! { r#type: Some(#_type) }),
			None => pieces.push(quote! { r#type: None }),
		}
		match &self.scripts {
			Some(scripts) => {
				let scripts = hashmap_to_tokens(scripts);
				pieces.push(quote! { scripts: Some(#scripts) })
			}
			None => pieces.push(quote! { scripts: None }),
		}
		match &self.dependencies {
			Some(dependencies) => {
				let dependencies = hashmap_to_tokens(dependencies);
				pieces.push(quote! { dependencies: Some(#dependencies) })
			}
			None => pieces.push(quote! { dependencies: None }),
		}
		match &self.dev_dependencies {
			Some(dev_dependencies) => {
				let dev_dependencies = hashmap_to_tokens(dev_dependencies);
				pieces.push(quote! { dev_dependencies: Some(#dev_dependencies) })
			}
			None => pieces.push(quote! { dev_dependencies: None }),
		}
		match &self.workspaces {
			Some(workspaces) => {
				let workspaces = workspaces
					.iter()
					.map(|workspace| quote! { #workspace })
					.collect::<Vec<_>>();
				pieces.push(quote! { workspaces: Some(vec![#(#workspaces),*]) })
			}
			None => pieces.push(quote! { workspaces: None }),
		}
		tokens.extend(quote! { PackageJsonPartial {
			#(#pieces),*
		} });
	}
}

fn hashmap_to_tokens(hashmap: &HashMap<&str, Option<&str>>) -> TokenStream {
	let mut tokens = vec![];
	for (key, value) in hashmap {
		let value = match value {
			Some(value) => quote! { Some(#value) },
			None => quote! { None },
		};
		tokens.push(quote! { (#key, #value) });
	}
	quote! { HashMap::from([#(#tokens),*]) }
}
