use template_builder::Builder;

pub fn main() {
	println!("cargo:rerun-if-changed=template_builder/templates");
	let builder = Builder::default();
	let res = builder.build();
	if let Err(err) = res {
		panic!("{:?}", err)
	}
}
