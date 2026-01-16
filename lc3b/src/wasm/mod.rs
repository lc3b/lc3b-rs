use wasm_bindgen::prelude::*;

use crate::{CallbacksRegistry, Computer, Program};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

#[wasm_bindgen]
pub fn parse_program(program: &str) {
    let program = Program::from_assembly(program);
    match program {
        Ok(p) => log(&format!("{:#?}", p)),
        Err(e) => log(&format!("error: {:?}", e)),
    }
}

pub enum Callback {
    JS(js_sys::Function),
}

#[wasm_bindgen]
pub struct WasmCallbacksRegistry {
    hello: js_sys::Function,
}

#[wasm_bindgen]
impl WasmCallbacksRegistry {
    pub fn new(hello: js_sys::Function) -> Self {
        WasmCallbacksRegistry { hello }
    }
}

#[wasm_bindgen]
pub fn new_computer(program: &str, callbacks: WasmCallbacksRegistry) -> Computer {
    let program = Program::from_assembly(program).unwrap();
    let callbacks = CallbacksRegistry {
        hello: Callback::JS(callbacks.hello),
    };
    Computer::new(program, callbacks)
}

#[wasm_bindgen]
pub fn next_instruction(computer: &mut Computer) {
    computer.next_instruction();
}

#[wasm_bindgen]
pub fn program_counter(computer: &Computer) -> u16 {
    computer.program_counter()
}

#[wasm_bindgen]
pub fn register0(computer: &Computer) -> u16 {
    computer.register0()
}

#[wasm_bindgen]
pub fn register1(computer: &Computer) -> u16 {
    computer.register1()
}

#[wasm_bindgen]
pub fn register2(computer: &Computer) -> u16 {
    computer.register2()
}

#[wasm_bindgen]
pub fn register3(computer: &Computer) -> u16 {
    computer.register3()
}

#[wasm_bindgen]
pub fn register4(computer: &Computer) -> u16 {
    computer.register4()
}

#[wasm_bindgen]
pub fn register5(computer: &Computer) -> u16 {
    computer.register5()
}

#[wasm_bindgen]
pub fn register6(computer: &Computer) -> u16 {
    computer.register6()
}

#[wasm_bindgen]
pub fn register7(computer: &Computer) -> u16 {
    computer.register7()
}
