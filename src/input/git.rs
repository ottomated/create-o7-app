use anyhow::Result;
use crossterm::style::{style, Stylize};
use inquire::{ui::RenderConfig, Confirm};
use std::path::PathBuf;

pub fn prompt(render_config: &RenderConfig) -> Result<Option<PathBuf>> {
	let git_path = which::which("git");

	let git = match git_path {
		Ok(git_path) => {
			let git = Confirm::new("Initialize a new git repository?")
				.with_render_config(*render_config)
				.with_default(true)
				.prompt()?;
			if git {
				Some(git_path)
			} else {
				None
			}
		}
		Err(_) => {
			let warn = style("!").red();
			let message = style(format!(
				"Git not found - https://github.com/git-guides/install-git"
			))
			.yellow()
			.bold();
			println!("{warn} {message}");
			println!(
				"  {}",
				style("(git is optional, but recommended)").yellow().dim()
			);
			None
		}
	};
	Ok(git)
}
