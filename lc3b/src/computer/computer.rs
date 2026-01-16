use lc3b_isa::{AddInstruction, Condition, Instruction, Register};
use wasm_bindgen::prelude::*;

use crate::{wasm::log, CallbacksRegistry, Memory, Program};

#[wasm_bindgen]
#[allow(dead_code)]
pub struct Computer {
    program: Program,
    program_counter: u16,
    condition: Condition,
    callbacks: CallbacksRegistry,
    registers: [u16; 8],
    memory: Memory,
}

impl Computer {
    pub fn new(program: Program, callbacks: CallbacksRegistry) -> Self {
        Computer {
            program,
            program_counter: 0,
            condition: Condition::default(),
            callbacks,
            registers: [0u16; 8],
            memory: Memory::default(),
        }
    }

    pub fn next_instruction(&mut self) {
        let instruction = self.load_instruction();
        log(&format!("instruction: {:?}", instruction));

        self.execute(instruction);

        self.callbacks.call_hello(self.program_counter as usize);

        self.program_counter += 1;
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

    pub fn load_instruction(&self) -> Instruction {
        self.program.instructions[self.program_counter as usize]
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
