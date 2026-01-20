use lc3b_isa::{AddInstruction, AndInstruction, Condition, Instruction, PCOffset6, PCOffset9, PCOffset11, Register};

use crate::{Memory, Observer, IO, USER_PROGRAM_START};

pub struct Computer<I: IO, O: Observer = ()> {
    program_counter: u16,
    condition: Condition,
    registers: [u16; 8],
    memory: Memory,
    io: I,
    observer: O,
}

impl<I: IO> Computer<I, ()> {
    /// Create computer with I/O but no observer
    pub fn new(io: I) -> Self {
        Self::with_observer(io, ())
    }
}

impl<I: IO, O: Observer> Computer<I, O> {
    /// Create computer with I/O and observer
    pub fn with_observer(io: I, observer: O) -> Self {
        Computer {
            program_counter: USER_PROGRAM_START,
            condition: Condition::default(),
            registers: [0u16; 8],
            memory: Memory::default(),
            io,
            observer,
        }
    }

    // --- Accessors ---

    pub fn io(&self) -> &I {
        &self.io
    }

    pub fn io_mut(&mut self) -> &mut I {
        &mut self.io
    }

    pub fn observer(&self) -> &O {
        &self.observer
    }

    pub fn observer_mut(&mut self) -> &mut O {
        &mut self.observer
    }

    pub fn program_counter(&self) -> u16 {
        self.program_counter
    }

    pub fn condition(&self) -> Condition {
        self.condition
    }

    pub fn condition_n(&self) -> bool {
        self.condition.n
    }

    pub fn condition_z(&self) -> bool {
        self.condition.z
    }

    pub fn condition_p(&self) -> bool {
        self.condition.p
    }

    pub fn register(&self, index: u8) -> u16 {
        self.registers[index as usize]
    }

    pub fn registers(&self) -> &[u16; 8] {
        &self.registers
    }

    // --- Memory ---

    pub fn load_program(&mut self, words: &[u16], start_addr: u16) {
        self.memory.load_words(start_addr, words);
        let old_pc = self.program_counter;
        self.program_counter = start_addr;
        self.observer.on_pc_change(old_pc, start_addr);
    }

    pub fn read_memory(&self, addr: u16) -> u16 {
        self.memory.read_word(addr)
    }

    pub fn write_memory(&mut self, addr: u16, value: u16) {
        let old = self.memory.read_word(addr);
        self.memory.write_word(addr, value);
        self.observer.on_memory_write(addr, old, value);
    }

    // --- Register operations (with observer notifications) ---

    fn load_register(&self, register: Register) -> u16 {
        self.registers[register.to_index()]
    }

    fn store_register(&mut self, register: Register, value: u16) {
        let index = register.to_index();
        let old = self.registers[index];
        self.registers[index] = value;
        self.observer.on_register_write(index as u8, old, value);
    }

    fn set_condition_codes(&mut self, value: u16) {
        let signed_value = value as i16;
        let new_cond = Condition {
            n: signed_value < 0,
            z: signed_value == 0,
            p: signed_value > 0,
        };
        if new_cond != self.condition {
            self.condition = new_cond;
            self.observer.on_condition_change(new_cond);
        }
    }

    fn set_pc(&mut self, new_pc: u16) {
        let old_pc = self.program_counter;
        self.program_counter = new_pc;
        if old_pc != new_pc {
            self.observer.on_pc_change(old_pc, new_pc);
        }
    }

    // --- Execution ---

    pub fn next_instruction(&mut self) {
        if self.io.is_halted() {
            return;
        }

        let pc = self.program_counter;
        let word = self.memory.read_word(pc);

        match Instruction::try_from(word) {
            Ok(inst) => {
                self.observer.on_instruction_start(pc, &inst);
                self.execute(inst);
                self.observer.on_instruction_end(pc, &inst);

                // Increment PC
                self.set_pc(self.program_counter.wrapping_add(1));
            }
            Err(e) => {
                eprintln!("Decode error at {:#06x}: {}", pc, e);
            }
        }
    }

    /// Run until halted or max_instructions reached
    pub fn run(&mut self, max_instructions: usize) -> usize {
        let mut count = 0;
        while !self.io.is_halted() && count < max_instructions {
            self.next_instruction();
            count += 1;
        }
        count
    }

    #[allow(unused_variables)]
    fn execute(&mut self, instruction: Instruction) {
        match instruction {
            Instruction::AddInstruction(add_instruction) => {
                self.perform_add_instruction(add_instruction);
            }
            Instruction::AndInstruction(and_instruction) => {
                self.perform_and_instruction(and_instruction);
            }
            Instruction::Br(condition, pcoffset9) => {
                self.perform_br_instruction(condition, pcoffset9);
            }
            Instruction::Jmp(base) => {
                self.perform_jmp_instruction(base);
            }
            Instruction::Jsr(pcoffset11) => {
                self.perform_jsr_instruction(pcoffset11);
            }
            Instruction::Jsrr(register) => {
                self.perform_jsrr_instruction(register);
            }
            Instruction::Ldb(dr, base, offset) => {
                self.perform_ldb_instruction(dr, base, offset);
            }
            Instruction::Ldi(register, register1, pcoffset6) => todo!(),
            Instruction::Ldr(register, register1, pcoffset6) => todo!(),
            Instruction::Lea(dr, pcoffset9) => {
                self.perform_lea_instruction(dr, pcoffset9);
            }
            Instruction::Not(dr, sr) => {
                self.perform_not_instruction(dr, sr);
            }
            Instruction::Ret => {
                // RET is just JMP R7
                self.perform_jmp_instruction(Register::Register7);
            }
            Instruction::Rti => todo!(),
            Instruction::Shf(register, register1, bit, bit1, immediate4) => todo!(),
            Instruction::Stb(register, register1, pcoffset6) => todo!(),
            Instruction::Sti(register, register1, pcoffset6) => todo!(),
            Instruction::Stw(sr, base, offset) => {
                self.perform_stw_instruction(sr, base, offset);
            }
            Instruction::Trap(trap_vect8) => {
                self.perform_trap(trap_vect8.value());
            }
        }
    }

    // --- Instruction implementations ---

    pub fn perform_add_instruction(&mut self, add_instruction: AddInstruction) {
        match add_instruction {
            AddInstruction::AddReg(dr, sr1, sr2) => {
                let value1 = self.load_register(sr1);
                let value2 = self.load_register(sr2);
                let result = value1.wrapping_add(value2);
                self.store_register(dr, result);
                self.set_condition_codes(result);
            }
            AddInstruction::AddImm(dr, sr1, immediate5) => {
                let value1 = self.load_register(sr1);
                // Sign-extend the 5-bit immediate
                let imm5 = immediate5.value();
                let value2 = if imm5 & 0x10 != 0 {
                    (imm5 as u16) | 0xFFE0 // sign extend
                } else {
                    imm5 as u16
                };
                let result = value1.wrapping_add(value2);
                self.store_register(dr, result);
                self.set_condition_codes(result);
            }
        }
    }

    pub fn perform_and_instruction(&mut self, and_instruction: AndInstruction) {
        match and_instruction {
            AndInstruction::AndReg(dr, sr1, sr2) => {
                let value1 = self.load_register(sr1);
                let value2 = self.load_register(sr2);
                let result = value1 & value2;
                self.store_register(dr, result);
                self.set_condition_codes(result);
            }
            AndInstruction::AndImm(dr, sr1, immediate5) => {
                let value1 = self.load_register(sr1);
                // Sign-extend the 5-bit immediate
                let imm5 = immediate5.value();
                let value2 = if imm5 & 0x10 != 0 {
                    (imm5 as u16) | 0xFFE0 // sign extend
                } else {
                    imm5 as u16
                };
                let result = value1 & value2;
                self.store_register(dr, result);
                self.set_condition_codes(result);
            }
        }
    }

    pub fn perform_not_instruction(&mut self, dr: Register, sr: Register) {
        let value = self.load_register(sr);
        let result = !value;
        self.store_register(dr, result);
        self.set_condition_codes(result);
    }

    pub fn perform_br_instruction(&mut self, condition: Condition, offset: PCOffset9) {
        // Check if any of the specified condition flags match the current condition codes
        if condition & self.condition {
            // The offset is relative to the incremented PC (PC+1)
            // Since next_instruction will add 1 after execute, we compute:
            // new_pc = (current_pc + 1) + offset - 1 = current_pc + offset
            // Then after +1: final_pc = current_pc + offset + 1 = (PC+1) + offset
            // Actually, we want final_pc = (PC+1) + offset
            // So we set PC = (PC+1) + offset - 1 = PC + offset
            let signed_offset = offset.sign_extend();
            self.program_counter = (self.program_counter as i16).wrapping_add(signed_offset) as u16;
        }
        // If branch not taken, do nothing - next_instruction will increment PC by 1
    }

    pub fn perform_jsr_instruction(&mut self, offset: PCOffset11) {
        // Save the return address (PC+1) in R7
        // Note: next_instruction will add 1 after execute, so we save current PC + 1
        let return_addr = self.program_counter.wrapping_add(1);
        self.store_register(Register::Register7, return_addr);

        // Jump to PC + 1 + LSHF(SEXT(offset), 1)
        // Since next_instruction adds 1 after execute, we set PC such that after +1 we get the target
        // target = (PC+1) + LSHF(SEXT(offset), 1)
        // So we set PC = target - 1 = PC + LSHF(SEXT(offset), 1)
        let signed_offset = offset.sign_extend();
        let shifted_offset = signed_offset << 1; // LSHF by 1 (multiply by 2 for word alignment)
        self.program_counter = (self.program_counter as i16).wrapping_add(shifted_offset) as u16;
    }

    pub fn perform_jsrr_instruction(&mut self, base: Register) {
        // Save the return address (PC+1) in R7
        let return_addr = self.program_counter.wrapping_add(1);

        // Get the target address from the base register BEFORE we modify R7
        // (in case base is R7)
        let target = self.load_register(base);

        self.store_register(Register::Register7, return_addr);

        // Jump to address in base register
        // Since next_instruction adds 1 after execute, we set PC = target - 1
        self.program_counter = target.wrapping_sub(1);
    }

    pub fn perform_jmp_instruction(&mut self, base: Register) {
        // JMP: PC = BaseR
        // Since next_instruction adds 1 after execute, we set PC = target - 1
        let target = self.load_register(base);
        self.program_counter = target.wrapping_sub(1);
    }

    pub fn perform_lea_instruction(&mut self, dr: Register, offset: PCOffset9) {
        // LEA: DR = PC + 1 + LSHF(SEXT(offset), 1)
        // The +1 is because PC points to current instruction, and offset is relative to PC+1
        // Since next_instruction will increment PC after execute, current PC is the instruction address
        let pc_plus_1 = self.program_counter.wrapping_add(1);
        let signed_offset = offset.sign_extend();
        let shifted_offset = (signed_offset << 1) as u16; // LSHF by 1
        let result = pc_plus_1.wrapping_add(shifted_offset);
        self.store_register(dr, result);
        self.set_condition_codes(result);
    }

    pub fn perform_stw_instruction(&mut self, sr: Register, base: Register, offset: PCOffset6) {
        // STW: MEM[BaseR + LSHF(SEXT(offset6), 1)] = SR
        let base_val = self.load_register(base);
        let signed_offset = offset.sign_extend();
        let shifted_offset = (signed_offset << 1) as u16; // LSHF by 1 for word alignment
        let address = base_val.wrapping_add(shifted_offset);
        let value = self.load_register(sr);
        self.memory.write_word(address, value);
    }

    pub fn perform_ldb_instruction(&mut self, dr: Register, base: Register, offset: PCOffset6) {
        // LDB: DR = SEXT(mem[BaseR + SEXT(offset6)][7:0])
        // Note: No shift for byte addressing (unlike LDR/STW which shift by 1)
        let base_val = self.load_register(base);
        let signed_offset = offset.sign_extend();
        let byte_address = base_val.wrapping_add(signed_offset as u16);

        // LC-3b memory is word-addressed internally, so we need to:
        // 1. Get the word address (byte_address >> 1)
        // 2. Determine which byte (low or high) based on LSB of byte_address
        let word_address = byte_address >> 1;
        let word = self.memory.read_word(word_address);

        let byte = if byte_address & 1 == 0 {
            // Even address: low byte (bits [7:0])
            (word & 0xFF) as u8
        } else {
            // Odd address: high byte (bits [15:8])
            ((word >> 8) & 0xFF) as u8
        };

        // Sign-extend the byte to 16 bits
        let result = if byte & 0x80 != 0 {
            // Negative: sign-extend with 1s
            (byte as u16) | 0xFF00
        } else {
            byte as u16
        };

        self.store_register(dr, result);
        self.set_condition_codes(result);
    }

    // --- TRAP implementation ---

    fn perform_trap(&mut self, vector: u8) {
        match vector {
            0x20 => {
                // GETC - read character into R0
                if let Some(ch) = self.io.read_char() {
                    self.store_register(Register::Register0, ch as u16);
                }
            }
            0x21 => {
                // OUT - write character from R0
                let ch = (self.registers[0] & 0xFF) as u8 as char;
                self.io.write_char(ch);
            }
            0x22 => {
                // PUTS - write null-terminated string starting at address in R0
                let mut addr = self.registers[0];
                loop {
                    let word = self.memory.read_word(addr);
                    if word == 0 {
                        break;
                    }
                    self.io.write_char((word & 0xFF) as u8 as char);
                    addr = addr.wrapping_add(1);
                }
            }
            0x23 => {
                // IN - prompt and read character with echo
                if let Some(ch) = self.io.read_char_with_echo() {
                    self.store_register(Register::Register0, ch as u16);
                }
            }
            0x24 => {
                // PUTSP - write packed string (2 chars per word) starting at address in R0
                let mut addr = self.registers[0];
                loop {
                    let word = self.memory.read_word(addr);
                    if word == 0 {
                        break;
                    }
                    // Low byte first
                    let ch1 = (word & 0xFF) as u8 as char;
                    if ch1 == '\0' {
                        break;
                    }
                    self.io.write_char(ch1);
                    // High byte second
                    let ch2 = ((word >> 8) & 0xFF) as u8 as char;
                    if ch2 == '\0' {
                        break;
                    }
                    self.io.write_char(ch2);
                    addr = addr.wrapping_add(1);
                }
            }
            0x25 => {
                // HALT
                self.io.halt();
            }
            _ => {
                // Unknown trap vector - could log or ignore
            }
        }
    }
}
