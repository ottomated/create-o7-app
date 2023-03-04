mod utils;

use anyhow::{Context, Result};
use proc_macro2::{Literal, TokenStream};
use quote::{format_ident, quote};
use std::collections::HashSet;
use std::env::{self, current_dir};
use std::path::{Path, PathBuf};
use std::process::Command;
use utils::{parse_feature_file, walk_dir, PackageJsonPartial};
use which::which;

pub struct Builder {
	out_dir: PathBuf,
	rustfmt: Option<PathBuf>,
}

#[derive(Debug)]
struct TemplateFile {
	features: Option<HashSet<String>>,
	path: PathBuf,
	contents: Vec<u8>,
}

#[derive(serde::Deserialize)]
struct Config {
	default_name: String,
	initial_commit: String,
	features: Vec<ConfigFeature>,
}

#[derive(serde::Deserialize)]
struct ConfigFeature {
	id: String,
	name: String,
	description: String,
}

impl TemplateFile {
	fn feature_count(&self) -> usize {
		match self.features.as_ref() {
			Some(features) => features.len(),
			None => 0,
		}
	}
}

impl Builder {
	pub fn new() -> Self {
		let out_dir = Path::new(&env::var("OUT_DIR").expect("OUT_DIR not set")).to_path_buf();
		let rustfmt = which("rustfmt").ok();

		Self { out_dir, rustfmt }
	}

	pub fn build(&self) -> Result<()> {
		let templates = self.load_templates()?;
		let config = self.load_config()?;
		// println!("cargo:warning={:?}", templates);
		self.write_file("templates.rs", self.make_templates_file(&templates))?;
		self.write_file("config.rs", self.make_config_file(config))?;

		Ok(())
	}

	fn make_config_file(&self, config: Config) -> TokenStream {
		let default_name = format!("./{}", config.default_name);
		let initial_commit = config.initial_commit;
		let features = config
			.features
			.iter()
			.map(|feature| format_ident!("{}", feature.id));

		let unique_descriptions = config
			.features
			.iter()
			.map(|feature| feature.description.clone())
			.collect::<HashSet<_>>();
		if unique_descriptions.len() != config.features.len() {
			panic!("Duplicate feature descriptions");
		}

		let name_map = config
			.features
			.iter()
			.map(|feature| {
				let description = feature.description.clone();
				let name = feature.name.clone();
				let id = format_ident!("{}", feature.id);
				quote! {
						FeatureDetails {
					   description: #description,
					   name:  #name,
					   feature: Feature::#id
					}
				}
			})
			.collect::<Vec<_>>();

		quote! {
			pub const DEFAULT_NAME: &str = #default_name;
			pub const INITIAL_COMMIT: &str = #initial_commit;

			#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
			pub enum Feature {
				#(#features),*
			}

			pub struct FeatureDetails {
				pub description: &'static str,
				pub name: &'static str,
				pub feature: Feature,
			}

			pub fn get_feature_name_map() -> Vec<FeatureDetails> {
				vec![
					#(#name_map),*
				]
			}
		}
	}

	fn load_config(&self) -> Result<Config> {
		let config_path = current_dir()
			.context("Could not get current directory")?
			.join("template_builder/templates/config.json");
		let config =
			std::fs::read_to_string(config_path).context("Could not read templates/config.json")?;
		let config: Config =
			serde_json::from_str(&config).context("Could not parse templates/config.json")?;

		Ok(config)
	}

	fn make_templates_file(&self, templates: &Vec<TemplateFile>) -> TokenStream {
		let mut template_files = vec![];
		let mut package_jsons = (None, vec![]);

		for template in templates {
			let path = template.path.to_string_lossy();
			let features = match &template.features {
				Some(features) => {
					let mut tokens = vec![];
					for feature in features {
						let ident = format_ident!("{}", feature);
						tokens.push(quote! { Feature::#ident });
					}
					quote! { Some(HashSet::from([#(#tokens),*])) }
				}
				None => quote! { None },
			};
			if path == "package.json" {
				let contents: PackageJsonPartial = serde_json::from_slice(&template.contents)
					.expect(&format!(
						"Could not parse package.json with features {:?}",
						template.features
					));
				let package_json = quote! {
					TemplateFile {
						path: #path,
						contents: #contents,
						features: #features,
					}
				};
				if template.features.is_none() {
					package_jsons.0 = Some(package_json);
				} else {
					package_jsons.1.push(package_json);
				}
			} else {
				let contents = Literal::byte_string(&template.contents);
				template_files.push(quote! {
					TemplateFile {
						path: #path,
						contents: #contents,
						features: #features,
					}
				});
			}
		}

		let (base, extras) = package_jsons;
		quote! {
			use crate::utils::{Feature, PackageJsonPartial};
			use std::collections::{HashSet, HashMap};
			#[derive(Debug)]
			pub struct TemplateFile<T> {
				pub path: &'static str,
				pub contents: T,
				pub features: Option<HashSet<Feature>>,
			}
			pub fn get_templates() -> Vec<TemplateFile<&'static [u8]>> {
				vec![
					#(#template_files),*,
				]
			}
			pub fn get_package_jsons() -> (
				TemplateFile<PackageJsonPartial<'static>>,
				Vec<TemplateFile<PackageJsonPartial<'static>>>
			) {
				(
					#base,
					vec![
						#(#extras),*
					]
				)
			}
		}
	}

	fn load_templates(&self) -> Result<Vec<TemplateFile>> {
		let template_dir = current_dir()
			.context("Could not get current directory")?
			.join("template_builder/templates");

		let mut templates = vec![];

		let base = template_dir.join("base");
		for (path, file) in walk_dir(&base) {
			let contents = std::fs::read(file.path())
				.with_context(|| format!("Could not read {}", path.display()))?;

			templates.push(TemplateFile {
				features: None,
				path,
				contents,
			});
		}

		let extras = template_dir.join("extras");
		for (path, file) in walk_dir(&extras) {
			let file_name = file.file_name().to_string_lossy();

			let features = parse_feature_file(&file_name);
			if features.is_none() {
				continue;
			}
			let (features, name) = features.unwrap();

			let contents = std::fs::read(file.path())
				.with_context(|| format!("Could not read {}", path.display()))?;

			let path = path.parent().unwrap().join(name);

			templates.push(TemplateFile {
				features: Some(features),
				path,
				contents,
			});
		}
		templates.sort_by(|a, b| a.feature_count().cmp(&b.feature_count()));

		Ok(templates)
	}

	fn write_file(&self, name: &str, tokens: TokenStream) -> anyhow::Result<()> {
		let path = self.out_dir.join(name);
		std::fs::write(path, tokens.to_string())
			.with_context(|| format!("Could not write {}", name))?;
		if let Some(rustfmt) = &self.rustfmt {
			let status = Command::new(rustfmt).arg(self.out_dir.join(name)).status();
			match status {
				Ok(status) if status.success() => {}
				Ok(status) => println!("cargo:warning=rustfmt on {} failed with {}", name, status),
				Err(err) => println!(
					"cargo:warning=rustfmt on {} failed with error: {}",
					name, err
				),
			}
		}
		Ok(())
	}
}
