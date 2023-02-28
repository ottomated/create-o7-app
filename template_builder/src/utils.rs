use proc_macro2::TokenStream;
use quote::{quote, ToTokens};
use std::{
	collections::{HashMap, HashSet},
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageJsonPartial<'a> {
	name: Option<&'a str>,
	version: Option<&'a str>,
	r#type: Option<&'a str>,
	scripts: Option<HashMap<&'a str, Option<&'a str>>>,
	dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
	dev_dependencies: Option<HashMap<&'a str, Option<&'a str>>>,
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
		tokens.extend(quote! { PackageJsonPartial {
			#(#pieces),*
		} });
		// let version = self.version;
		// let _type = self.r#type;
		// let scripts = self.scripts.map();
		// let dependencies = self.dependencies;
		// let dev_dependencies = self.dev_dependencies;
		// tokens.extend(quote! {
		// 	PackageJsonPartial {
		// 		name: #name,
		// 		version: #version,
		// 		r#type: #_type,
		// 		scripts: #scripts,
		// 		dependencies: #dependencies,
		// 		dev_dependencies: #dev_dependencies,
		// 	}
		// })
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
