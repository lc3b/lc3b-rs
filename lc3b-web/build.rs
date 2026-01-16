use std::path::PathBuf;
use std::process::Command;

use wasm_pack::command::build::{Build, BuildOptions, Target};

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let workspace_root = manifest_dir.parent().expect("workspace root");

    let lc3b_path = workspace_root.join("lc3b");
    let lc3b_react_path = workspace_root.join("lc3b-react");
    let wasm_pkg_path = lc3b_path.join("pkg");

    // Watch for changes in lc3b source files
    println!("cargo::rerun-if-changed={}", lc3b_path.join("src").display());
    println!("cargo::rerun-if-changed={}", lc3b_path.join("Cargo.toml").display());
    
    // Watch for changes in lc3b-react source files
    println!("cargo::rerun-if-changed={}", lc3b_react_path.join("src").display());
    println!("cargo::rerun-if-changed={}", lc3b_react_path.join("public").display());
    println!("cargo::rerun-if-changed={}", lc3b_react_path.join("package.json").display());
    println!("cargo::rerun-if-changed={}", lc3b_react_path.join("tsconfig.json").display());
    println!("cargo::rerun-if-changed={}", lc3b_react_path.join("tailwind.config.js").display());

    // Step 1: Build WASM to lc3b/pkg/ (where React expects it)
    println!("cargo:warning=Building WASM module...");
    let build_opts = BuildOptions {
        path: Some(lc3b_path.clone()),
        out_dir: wasm_pkg_path.display().to_string(),
        disable_dts: false, // Keep TypeScript definitions for React
        target: Target::Web,
        ..Default::default()
    };
    let mut build = Build::try_from_opts(build_opts).unwrap();
    build.run().expect("wasm-pack build failed");

    // Step 2: Run npm install if node_modules doesn't exist
    let node_modules = lc3b_react_path.join("node_modules");
    if !node_modules.exists() {
        println!("cargo:warning=Running npm install in lc3b-react...");
        let status = Command::new("npm")
            .arg("install")
            .current_dir(&lc3b_react_path)
            .status()
            .expect("failed to run npm install");
        if !status.success() {
            panic!("npm install failed");
        }
    }

    // Step 3: Build React app
    println!("cargo:warning=Building React app...");
    let status = Command::new("npm")
        .arg("run")
        .arg("build")
        .current_dir(&lc3b_react_path)
        .status()
        .expect("failed to run npm run build");
    if !status.success() {
        panic!("npm run build failed");
    }

    // Step 4: Export paths to React build output for embedding
    let react_build_path = lc3b_react_path.join("build");
    
    println!(
        "cargo:rustc-env=REACT_INDEX_PATH={}",
        react_build_path.join("index.html").display()
    );
    
    // React build outputs JS/CSS with hashed filenames, we need to find them
    let static_js_dir = react_build_path.join("static").join("js");
    let static_css_dir = react_build_path.join("static").join("css");
    
    // Find the main JS bundle (main.*.js)
    let main_js = find_file_matching(&static_js_dir, "main.*.js")
        .expect("Could not find main.*.js in React build");
    println!("cargo:rustc-env=REACT_MAIN_JS_PATH={}", main_js.display());
    
    // Find the main CSS bundle (main.*.css)
    let main_css = find_file_matching(&static_css_dir, "main.*.css")
        .expect("Could not find main.*.css in React build");
    println!("cargo:rustc-env=REACT_MAIN_CSS_PATH={}", main_css.display());

    // WASM files are now in lc3b/pkg/
    println!(
        "cargo:rustc-env=LC3B_PKG_JS_PATH={}",
        wasm_pkg_path.join("lc3b.js").display()
    );
    println!(
        "cargo:rustc-env=LC3B_PKG_WASM_PATH={}",
        wasm_pkg_path.join("lc3b_bg.wasm").display()
    );
}

fn find_file_matching(dir: &PathBuf, pattern: &str) -> Option<PathBuf> {
    let pattern_path = dir.join(pattern);
    for entry in glob::glob(&pattern_path.display().to_string()).ok()? {
        if let Ok(path) = entry {
            return Some(path);
        }
    }
    None
}
