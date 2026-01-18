#![forbid(unsafe_code)]

//! C to LC-3B Assembly Compiler
//!
//! This crate compiles a subset of C to LC-3B assembly text.

mod codegen;

pub use codegen::{compile, CompileError, CompileOptions};
