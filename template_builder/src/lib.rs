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
	default: Option<bool>,
	options: Option<Vec<ConfigFeatureOption>>,
	// Hide this option and auto-enable it if any of the given features are selected
	required_if: Option<Vec<String>>,
	// Hide this option if any of the given features are selected
	hidden_if: Option<Vec<String>>,
	// Hide this option if any of the given features are not selected
	hidden_if_not: Option<Vec<String>>,
}

#[derive(serde::Deserialize)]
struct ConfigFeatureOption {
	id: Option<String>,
	name: String,
	// Hide this option if any of the given features are selected
	hidden_if: Option<Vec<String>>,
	// Hide this option if any of the given features are not selected
	hidden_if_not: Option<Vec<String>>,
}

fn generate_hidden_set(features: &Option<Vec<String>>) -> TokenStream {
	match features {
		Some(features) => {
			let features = features
				.iter()
				.map(|f| {
					let id = format_ident!("{}", f);
					quote! { Feature::#id }
				})
				.collect::<Vec<_>>();
			quote! { Some(vec![#(#features),*]) }
		}
		None => quote! { None },
	}
}

impl TemplateFile {
	fn feature_count(&self) -> usize {
		match self.features.as_ref() {
			Some(features) => features.len(),
			None => 0,
		}
	}
}

impl Default for Builder {
	fn default() -> Self {
		let out_dir = Path::new(&env::var("OUT_DIR").expect("OUT_DIR not set")).to_path_buf();
		let rustfmt = which("rustfmt").ok();

		Self { out_dir, rustfmt }
	}
}

impl Builder {
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
			.flat_map(|feature| match &feature.options {
				Some(options) => options
					.iter()
					.filter_map(|o| o.id.as_ref().map(|id| format_ident!("{}", id)))
					.collect(),
				None => vec![format_ident!("{}", feature.id)],
			});

		let unique_descriptions = config
			.features
			.iter()
			.map(|feature| feature.description.clone())
			.collect::<HashSet<_>>();
		if unique_descriptions.len() != config.features.len() {
			panic!("Duplicate feature descriptions");
		}

		let details_list = config
			.features
			.iter()
			.map(|feature| {
				let description = feature.description.clone();
				let name = feature.name.clone();

				let hidden_if = generate_hidden_set(&feature.hidden_if);
				let hidden_if_not = generate_hidden_set(&feature.hidden_if_not);

				if let Some(options) = &feature.options {
					let options = options
						.iter()
						.map(|option| {
							let feature = if let Some(id) = &option.id {
								let id = format_ident!("{}", id);
								quote! { Some(Feature::#id) }
							} else {
								quote! { None }
							};
							let name = option.name.clone();
							let hidden_if = generate_hidden_set(&option.hidden_if);
							let hidden_if_not = generate_hidden_set(&option.hidden_if_not);
							quote! {
								FeatureOption {
									feature: #feature,
									name: #name,
									hidden_if: #hidden_if,
									hidden_if_not: #hidden_if_not,
								}
							}
						})
						.collect::<Vec<_>>();

					quote! {
						FeatureDetails::Option(OptionFeatureDetails {
							name: #name,
							description: #description,
							options: vec![
								#(#options),*
							],
							hidden_if: #hidden_if,
							hidden_if_not: #hidden_if_not,
						})
					}
				} else {
					let id = format_ident!("{}", feature.id);
					let default = feature.default.unwrap_or(false);
					let required_if = generate_hidden_set(&feature.required_if);
					quote! {
						FeatureDetails::Boolean(BooleanFeatureDetails {
							feature: Feature::#id,
							name: #name,
							description: #description,
							default: #default,
							required_if: #required_if,
							hidden_if: #hidden_if,
							hidden_if_not: #hidden_if_not,
						})
					}
				}
			})
			.collect::<Vec<_>>();

		quote! {
			use std::collections::HashSet;

			pub const DEFAULT_NAME: &str = #default_name;
			pub const INITIAL_COMMIT: &str = #initial_commit;

			#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
			pub enum Feature {
				Npm,
				Pnpm,
				Yarn,
				Bun,
				#(#features),*
			}

			pub enum FeatureDetails {
				Boolean(BooleanFeatureDetails),
				Option(OptionFeatureDetails),
			}

			pub struct OptionFeatureDetails {
				pub name: &'static str,
				pub description: &'static str,
				pub options: Vec<FeatureOption>,
				hidden_if: Option<Vec<Feature>>,
				hidden_if_not: Option<Vec<Feature>>,
			}

			pub struct FeatureOption {
				pub feature: Option<Feature>,
				pub name: &'static str,
				hidden_if: Option<Vec<Feature>>,
				hidden_if_not: Option<Vec<Feature>>,
			}

			impl Display for FeatureOption {
				fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
					write!(f, "{}", self.name)
				}
			}

			impl OptionFeatureDetails {
				pub fn should_show(&self, features: &HashSet<Feature>) -> bool {
					if let Some(hidden_if) = &self.hidden_if {
						if hidden_if.iter().any(|f| features.contains(f)) {
							return false;
						}
					}
					if let Some(hidden_if_not) = &self.hidden_if_not {
						if hidden_if_not.iter().all(|f| !features.contains(f)) {
							return false;
						}
					}
					true
				}
			}

			impl FeatureOption {
				pub fn should_show(&self, features: &HashSet<Feature>) -> bool {
					if let Some(hidden_if) = &self.hidden_if {
						if hidden_if.iter().any(|f| features.contains(f)) {
							return false;
						}
					}
					if let Some(hidden_if_not) = &self.hidden_if_not {
						if hidden_if_not.iter().all(|f| !features.contains(f)) {
							return false;
						}
					}
					true
				}
			}

			pub struct BooleanFeatureDetails {
				pub feature: Feature,
				pub name: &'static str,
				pub description: &'static str,
				pub default: bool,
				pub required_if: Option<Vec<Feature>>,
				hidden_if: Option<Vec<Feature>>,
				hidden_if_not: Option<Vec<Feature>>,
			}

			impl BooleanFeatureDetails {
				// Returns (show, default)
				pub fn should_show(&self, features: &HashSet<Feature>) -> (bool, bool) {
					if let Some(required_if) = &self.required_if {
						if required_if.iter().any(|f| features.contains(f)) {
							return (false, true);
						}
					}
					if let Some(hidden_if) = &self.hidden_if {
						if hidden_if.iter().any(|f| features.contains(f)) {
							return (false, false);
						}
					}
					if let Some(hidden_if_not) = &self.hidden_if_not {
						if hidden_if_not.iter().all(|f| !features.contains(f)) {
							return (false, false);
						}
					}
					(true, self.default)
				}
			}

			impl Display for FeatureDetails {
				fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
					let (name, description) = match self {
						FeatureDetails::Boolean(details) => (details.name, details.description),
						FeatureDetails::Option(details) => (details.name, details.description),
					};
					write!(
						f,
						"{} {}",
						name,
						crossterm::style::Stylize::dim(
							crossterm::style::style(description)
						),
					)
				}
			}

			pub fn get_feature_list() -> Vec<FeatureDetails> {
				vec![
					#(#details_list),*
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
					.unwrap_or_else(|_| {
						panic!(
							"Could not parse package.json with features {:?}",
							template.features
						)
					});
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

			let Some((files, name)) = features else {
				println!("cargo:warning=Could not parse feature file {}", file_name);
				continue;
			};

			let contents = std::fs::read(file.path())
				.with_context(|| format!("Could not read {}", path.display()))?;

			let path = path.parent().unwrap().join(name);

			for features in files {
				templates.push(TemplateFile {
					features: Some(features),
					path: path.clone(),
					contents: contents.clone(),
				});
			}
		}
		templates.sort_by_key(|t| t.feature_count());

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
