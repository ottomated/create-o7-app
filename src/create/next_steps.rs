use std::path::Path;

use crate::input::UserInput;

pub fn print(input: &UserInput) {
	println!("\n");
	println!("{{O}} All done!");
	println!("  cd {}", get_shortest_path(&input.location.path));

	match input.install_deps {
		Some(ref pm) => {
			println!("  {}", pm.package_manager.run_script("dev"));
		}
		None => {
			println!("  npm install");
			println!("	npm run dev");
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
