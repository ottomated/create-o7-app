mod args;
mod create;
mod input;
#[cfg(test)]
mod test;
mod utils;

use anyhow::Result;
use crossterm::style::{style, Stylize};
use utils::get_package_manager;

use crate::create::create;

fn main() -> Result<()> {
	let arguments = args::parse();

	if arguments.disable_telemetry {
		let package_manager = get_package_manager();
		let enable_command = format!("{package_manager} create o7-app --enable-telemetry");
		println!();
		println!("Telemetry disabled :(");
		println!("Run '{}' to re-enable", style(enable_command).green());
		println!();
		std::process::exit(0);
	}
	if arguments.enable_telemetry {
		println!();
		println!("Telemetry enabled :)");
		println!();
		std::process::exit(0);
	}

	let input = input::prompt()?;

	create(input)?;

	Ok(())
}
