#![forbid(unsafe_code)]

//! C to LC-3B Assembly Compiler
//!
//! This crate compiles a subset of C to LC-3B assembly text.

mod codegen;
mod headers;

pub use codegen::{compile, CompileError, CompileOptions};
pub use headers::{available_headers, get_header, Header};
