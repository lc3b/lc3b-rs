use wasm_bindgen::prelude::*;

use crate::{BufferedIO, Computer, Program, UIObserver, USER_PROGRAM_START, IO};
use lc3b_c_compiler::{compile as compile_c, available_headers, CompileOptions};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

/// Compile C source code to LC-3b assembly
#[wasm_bindgen]
pub fn compile_c_to_assembly(source: &str) -> Result<String, String> {
    let options = CompileOptions::default();
    compile_c(source, &options).map_err(|e| e.to_string())
}

/// Get the list of available C header file names
#[wasm_bindgen]
pub fn get_available_headers() -> Vec<String> {
    available_headers().iter().map(|h| h.name.to_string()).collect()
}

/// Get the contents of a C header file by name
#[wasm_bindgen]
pub fn get_header_contents(name: &str) -> Option<String> {
    available_headers()
        .iter()
        .find(|h| h.name == name)
        .map(|h| h.contents.to_string())
}

/// Returns the WASM linear memory size in bytes
#[wasm_bindgen]
pub fn wasm_memory_size() -> usize {
    wasm_bindgen::memory()
        .dyn_into::<js_sys::WebAssembly::Memory>()
        .unwrap()
        .buffer()
        .dyn_into::<js_sys::ArrayBuffer>()
        .unwrap()
        .byte_length() as usize
}

#[wasm_bindgen]
pub fn parse_program(program: &str) {
    let program = Program::from_assembly(program);
    match program {
        Ok(p) => log(&format!("{:#?}", p)),
        Err(e) => log(&format!("error: {:?}", e)),
    }
}

/// WASM-exposed computer wrapping Computer<BufferedIO, UIObserver>
#[wasm_bindgen]
pub struct WasmComputer {
    inner: Computer<BufferedIO, UIObserver>,
}

#[wasm_bindgen]
impl WasmComputer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Computer::with_observer(BufferedIO::new(), UIObserver::new()),
        }
    }

    pub fn load_assembly(&mut self, program: &str) -> Result<(), String> {
        let program = Program::from_assembly(program).map_err(|e| format!("{:?}", e))?;
        let words = program.to_words();
        self.inner.load_program(&words, USER_PROGRAM_START);
        Ok(())
    }

    pub fn next_instruction(&mut self) -> Result<(), String> {
        self.inner.observer_mut().reset_instruction_state();
        self.inner.next_instruction().map_err(|e| e.to_string())
    }

    pub fn run(&mut self, max_instructions: usize) -> Result<usize, String> {
        self.inner.run(max_instructions).map_err(|e| e.to_string())
    }

    // --- State accessors ---

    pub fn program_counter(&self) -> u16 {
        self.inner.program_counter()
    }

    pub fn register(&self, index: u8) -> u16 {
        self.inner.register(index)
    }

    pub fn condition_n(&self) -> bool {
        self.inner.condition_n()
    }

    pub fn condition_z(&self) -> bool {
        self.inner.condition_z()
    }

    pub fn condition_p(&self) -> bool {
        self.inner.condition_p()
    }

    pub fn read_memory(&self, addr: u16) -> u16 {
        self.inner.read_memory(addr)
    }

    // --- Observer state ---

    pub fn last_modified_register(&self) -> i8 {
        self.inner
            .observer()
            .last_modified_register()
            .map(|r| r as i8)
            .unwrap_or(-1)
    }

    // --- I/O state ---

    pub fn console_output(&self) -> String {
        self.inner.io().output().to_string()
    }

    pub fn clear_console(&mut self) {
        self.inner.io_mut().clear_output();
    }

    pub fn is_halted(&self) -> bool {
        self.inner.io().is_halted()
    }

    pub fn push_input(&mut self, ch: char) {
        self.inner.io_mut().push_input(ch);
    }

    pub fn push_input_str(&mut self, s: &str) {
        self.inner.io_mut().push_input_str(s);
    }
}

impl Default for WasmComputer {
    fn default() -> Self {
        Self::new()
    }
}
