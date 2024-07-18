use crate::{
	cookie::{get_cookie_bool, set_cookie},
	input::UserInput,
	utils::{get_package_manager, Feature, PackageManager},
};
use crossterm::style::{style, Stylize};
use serde::Serialize;

const TELEMETRY_URL: &str = "http://localhost:8787/report";

pub fn print_initial_warning() {
	if get_cookie_bool("telemetry_warned", false) {
		// Already warned
		return;
	}

	let pm = get_package_manager();
	let message = style(format!(
		"{}{}{}",
		style("Anonymous telemetry is enabled by default, run '").dark_grey(),
		style(format!("{pm} create o7-app --disable-telemetry")).dark_green(),
		style("' to disable").dark_grey(),
	))
	.dark_grey();

	println!();
	println!("{message}");

	if let Err(err) = set_cookie("telemetry_warned", "true") {
		eprintln!("This message will be displayed again because we couldn't write a file: {err}");
	}
	println!();
}

pub fn enable() {
	set_cookie("telemetry", "true").unwrap();

	println!();
	println!("Telemetry enabled :)");
	println!();
}

pub fn disable() {
	set_cookie("telemetry", "false").unwrap();

	let package_manager = get_package_manager();
	let enable_command = format!("{package_manager} create o7-app --enable-telemetry");
	println!();
	println!("Telemetry disabled :(");
	println!("Run '{}' to re-enable", style(enable_command).green());
	println!();
}

#[derive(Debug, Serialize)]
pub struct TelemetryReport {
	version: String,
	package_manager: PackageManager,
	install_deps: bool,
	git_init: bool,
	features: Vec<Feature>,
}

impl From<&UserInput> for TelemetryReport {
	fn from(input: &UserInput) -> Self {
		Self {
			version: env!("CARGO_PKG_VERSION").to_string(),
			package_manager: get_package_manager(),
			install_deps: input.install_deps.is_some(),
			git_init: input.git.is_some(),
			features: input.features.iter().cloned().collect(),
		}
	}
}

pub fn report(report: TelemetryReport) {
	if !get_cookie_bool("telemetry", true) {
		return;
	}
	let client = reqwest::blocking::Client::new();
	let res = client.post(TELEMETRY_URL).json(&report).send();
	if cfg!(debug_assertions) {
		if let Err(err) = res {
			eprintln!("{err}\n{err:?}");
		}
	}
}
