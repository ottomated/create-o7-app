mod args;
mod cookie;
mod create;
mod input;
mod telemetry;
#[cfg(test)]
mod test;
mod utils;

use anyhow::Result;

use crate::create::create;

fn main() -> Result<()> {
	let arguments = args::parse();

	if let Some(package_manager) = arguments.package_manager {
		utils::PACKAGE_MANAGER_OVERRIDE
			.lock()
			.unwrap()
			.replace(package_manager);
	}

	if arguments.disable_telemetry {
		telemetry::disable();
		std::process::exit(0);
	}

	if arguments.enable_telemetry {
		telemetry::enable();
		std::process::exit(0);
	}

	let input = input::prompt()?;

	telemetry::report((&input).into());

	create(input)?;

	Ok(())
}
