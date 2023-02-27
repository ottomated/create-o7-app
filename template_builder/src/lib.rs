mod utils;

use anyhow::{Context, Result};
use proc_macro2::{Literal, TokenStream};
use quote::{format_ident, quote};
use std::collections::HashSet;
use std::env::{self, current_dir};
use std::path::{Path, PathBuf};
use std::process::Command;
use utils::{parse_feature_file, walk_dir};
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
		// println!("cargo:warning={:?}", templates);
		self.write_file("templates.rs", self.make_templates_file(templates))?;
		println!(
			"cargo:warning=Out: \"{}/templates.rs\"",
			self.out_dir.display()
		);

		Ok(())
	}

	fn make_templates_file(&self, templates: Vec<TemplateFile>) -> TokenStream {
		let mut tokens = vec![];

		for template in templates {
			let path = template.path.to_string_lossy();
			let contents = Literal::byte_string(&template.contents);
			let features = match template.features {
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

			tokens.push(quote! {
				TemplateFile {
					path: #path,
					contents: #contents,
					features: #features,
				}
			});
		}

		quote! {
			use crate::utils::Feature;
			use std::collections::HashSet;
			#[derive(Debug)]
			pub struct TemplateFile {
				pub path: &'static str,
				pub contents: &'static [u8],
				pub features: Option<HashSet<Feature>>,
			}
			pub fn get_templates() -> Vec<TemplateFile> {
				vec![
					#(#tokens),*,
				]
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
