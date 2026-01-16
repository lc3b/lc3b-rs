use lc3b_isa::{AddInstruction, Condition, Instruction, Register};
use wasm_bindgen::prelude::*;

use crate::{wasm::log, CallbacksRegistry, Memory, USER_PROGRAM_START};

#[wasm_bindgen]
#[allow(dead_code)]
pub struct Computer {
    program_counter: u16,
    condition: Condition,
    callbacks: CallbacksRegistry,
    registers: [u16; 8],
    memory: Memory,
}

impl Computer {
    pub fn new(callbacks: CallbacksRegistry) -> Self {
        Computer {
            program_counter: USER_PROGRAM_START,
            condition: Condition::default(),
            callbacks,
            registers: [0u16; 8],
            memory: Memory::default(),
        }
    }

    /// Load a program (as encoded u16 words) into memory at the specified address
    pub fn load_program(&mut self, words: &[u16], start_addr: u16) {
        self.memory.load_words(start_addr, words);
        self.program_counter = start_addr;
    }

    pub fn next_instruction(&mut self) {
        let instruction = self.fetch_instruction();
        log(&format!("PC={:#06X} instruction: {:?}", self.program_counter, instruction));

        match instruction {
            Ok(inst) => {
                self.execute(inst);
                self.program_counter = self.program_counter.wrapping_add(1);
            }
            Err(e) => {
                log(&format!("Decode error: {}", e));
            }
        }

        self.callbacks.call_hello(self.program_counter as usize);
    }

    pub fn program_counter(&self) -> u16 {
        self.program_counter
    }

    pub fn register0(&self) -> u16 {
        self.registers[0]
    }

    pub fn register1(&self) -> u16 {
        self.registers[1]
    }

    pub fn register2(&self) -> u16 {
        self.registers[2]
    }

    pub fn register3(&self) -> u16 {
        self.registers[3]
    }

    pub fn register4(&self) -> u16 {
        self.registers[4]
    }

    pub fn register5(&self) -> u16 {
        self.registers[5]
    }

    pub fn register6(&self) -> u16 {
        self.registers[6]
    }

    pub fn register7(&self) -> u16 {
        self.registers[7]
    }

    /// Read a word from memory
    pub fn read_memory(&self, addr: u16) -> u16 {
        self.memory.read_word(addr)
    }

    /// Fetch the instruction at the current PC from memory and decode it
    fn fetch_instruction(&self) -> Result<Instruction, lc3b_isa::DecodeError> {
        let word = self.memory.read_word(self.program_counter);
        Instruction::try_from(word)
    }

    #[allow(unused_variables)]
    pub fn execute(&mut self, instruction: Instruction) {
        match instruction {
            Instruction::AddInstruction(add_instruction) => {
                self.perform_add_instruction(add_instruction);
                log("add instruction done");
                log(&format!("registers: {:#?}", self.registers));
            }
            Instruction::AndInstruction(and_instruction) => todo!(),
            Instruction::Br(condition, pcoffset9) => todo!(),
            Instruction::Jmp(register) => todo!(),
            Instruction::Jsr(pcoffset11) => todo!(),
            Instruction::Jsrr(register) => todo!(),
            Instruction::Ldb(register, register1, pcoffset6) => todo!(),
            Instruction::Ldi(register, register1, pcoffset6) => todo!(),
            Instruction::Ldr(register, register1, pcoffset6) => todo!(),
            Instruction::Lea(register, pcoffset9) => todo!(),
            Instruction::Not(register, register1) => todo!(),
            Instruction::Ret => todo!(),
            Instruction::Rti => todo!(),
            Instruction::Shf(register, register1, bit, bit1, immediate4) => todo!(),
            Instruction::Stb(register, register1, pcoffset6) => todo!(),
            Instruction::Sti(register, register1, pcoffset6) => todo!(),
            Instruction::Str(register, register1, pcoffset6) => todo!(),
            Instruction::Trap(trap_vect8) => todo!(),
        }
    }

    pub fn load_register(&self, register: Register) -> u16 {
        let index = register.to_index();
        self.registers[index]
    }

    pub fn store_register(&mut self, register: Register, value: u16) {
        let index = register.to_index();
        self.registers[index] = value;
    }

    pub fn perform_add_instruction(&mut self, add_instruction: AddInstruction) {
        match add_instruction {
            AddInstruction::AddReg(register, register1, register2) => {
                let value1 = self.load_register(register1);
                let value2 = self.load_register(register2);
                self.store_register(register, value1 + value2);
            }
            AddInstruction::AddImm(register, register1, immediate5) => {
                let value1 = self.load_register(register1);
                let value2 = immediate5.to_value();
                self.store_register(register, value1 + value2);
            }
        }
    }
}
