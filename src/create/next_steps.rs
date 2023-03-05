use std::path::Path;

use crossterm::style::{style, Stylize};

use super::git::GitStep;
use crate::utils::{get_package_manager, INITIAL_COMMIT};
use crate::{create::log_step_start, input::UserInput};

fn log_with_info(command: String, info: &str) {
	let command = style(command).green();
	let info = style(info).green().dim();
	println!("  {command} {info}");
}

pub fn print(input: &UserInput, git_error: Option<&GitStep>, install_deps: bool) {
	log_step_start("All done! Next steps:");

	log_with_info(
		format!("cd {}", get_shortest_path(&input.location.path)),
		"(navigate to your project's folder)",
	);

	let git_command = git_error.map(|step| match step {
		GitStep::Init => format!(
			"git init && git add . && git commit -m \"{}\"",
			INITIAL_COMMIT
		),
		GitStep::Add => format!("git add . && git commit -m \"{}\"", INITIAL_COMMIT),
		GitStep::Commit => format!("git commit -m \"{}\"", INITIAL_COMMIT),
	});

	if let Some(git_command) = git_command {
		log_with_info(git_command, "(initialize your git repository)");
	}

	match input.install_deps {
		Some(ref pm) => {
			if !install_deps {
				log_with_info(
					format!("{} install", pm.package_manager),
					"(install dependencies)",
				);
			}

			log_with_info(
				pm.package_manager.run_script("dev"),
				"(start the dev server)",
			);
		}
		None => {
			let package_manager = get_package_manager();
			log_with_info(
				format!("{} install", package_manager),
				"(install dependencies)",
			);
			log_with_info(package_manager.run_script("dev"), "(start the dev server)");
		}
	};
}

fn get_shortest_path(path: &Path) -> String {
	let absolute = format!("{}", path.display());

	let relative = match std::env::current_dir() {
		Ok(current_dir) => {
			pathdiff::diff_paths(&absolute, &current_dir).map(|path| format!("{}", path.display()))
		}
		Err(_) => None,
	};
	match relative {
		Some(relative) => {
			if relative.len() < absolute.len() {
				relative
			} else {
				absolute
			}
		}
		None => absolute,
	}
}
