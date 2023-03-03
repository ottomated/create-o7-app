use std::path::Path;

use crossterm::style::{style, Stylize};

use crate::{create::log_step_start, input::UserInput};

fn log_with_info(command: &str, info: &str) {
	let command = style(command).green();
	let info = style(info).green().dim();
	println!("  {command} {info}");
}

pub fn print(input: &UserInput) {
	log_step_start("All done! Next steps:");

	log_with_info(
		&format!("cd {}", get_shortest_path(&input.location.path)),
		"(navigate to your project's folder)",
	);

	match input.install_deps {
		Some(ref pm) => {
			log_with_info(
				&pm.package_manager.run_script("dev"),
				"(start the dev server)",
			);
		}
		None => {
			log_with_info("npm install", "(install dependencies)");
			log_with_info("npm run dev", "(start the dev server)");
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
