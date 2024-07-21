use clap::Parser;

use crate::utils::PackageManager;

#[derive(clap::Parser, Debug)]
#[command(version, author, long_about = None)]
pub struct Args {
	/// Override the automatic package manager detection
	#[arg(value_enum, long)]
	pub package_manager: Option<PackageManager>,

	/// Turn off telemetry reporting
	#[arg(long)]
	pub disable_telemetry: bool,

	/// Turn on telemetry reporting
	#[arg(long)]
	pub enable_telemetry: bool,
}

pub fn parse() -> Args {
	Args::parse()
}
