#![allow(dead_code)]

use std::str::FromStr;

use crate::Register;

/// Decode error for invalid instructions
#[derive(Debug, Clone, PartialEq)]
pub struct DecodeError {
    pub word: u16,
    pub reason: String,
}

impl std::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Failed to decode 0x{:04X}: {}", self.word, self.reason)
    }
}

impl std::error::Error for DecodeError {}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Instruction {
    AddInstruction(AddInstruction),
    AndInstruction(AndInstruction),
    Br(Condition, PCOffset9),
    Jmp(Register),
    Jsr(PCOffset11),
    Jsrr(Register),
    Ldb(Register, Register, PCOffset6),
    Ldi(Register, Register, PCOffset6),
    Ldr(Register, Register, PCOffset6),
    Lea(Register, PCOffset9),
    Not(Register, Register),
    Ret,
    Rti,
    Shf(Register, Register, Bit, Bit, Immediate4),
    Stb(Register, Register, PCOffset6),
    Sti(Register, Register, PCOffset6),
    Str(Register, Register, PCOffset6),
    Trap(TrapVect8),
}

impl From<&Instruction> for u16 {
    fn from(value: &Instruction) -> Self {
        match value {
            Instruction::AddInstruction(AddInstruction::AddReg(dr, sr1, sr2)) => {
                let opcode = 0b0001u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr1_bits = (sr1.to_index() as u16) << 6;
                let sr2_bits = sr2.to_index() as u16;
                opcode | dr_bits | sr1_bits | sr2_bits
            }
            Instruction::AddInstruction(AddInstruction::AddImm(dr, sr1, imm5)) => {
                let opcode = 0b0001u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr1_bits = (sr1.to_index() as u16) << 6;
                let imm_flag = 1u16 << 5;
                let imm_bits = (imm5.0 as u16) & 0x1F;
                opcode | dr_bits | sr1_bits | imm_flag | imm_bits
            }
            Instruction::AndInstruction(AndInstruction::AndReg(dr, sr1, sr2)) => {
                let opcode = 0b0101u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr1_bits = (sr1.to_index() as u16) << 6;
                let sr2_bits = sr2.to_index() as u16;
                opcode | dr_bits | sr1_bits | sr2_bits
            }
            Instruction::AndInstruction(AndInstruction::AndImm(dr, sr1, imm5)) => {
                let opcode = 0b0101u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr1_bits = (sr1.to_index() as u16) << 6;
                let imm_flag = 1u16 << 5;
                let imm_bits = (imm5.0 as u16) & 0x1F;
                opcode | dr_bits | sr1_bits | imm_flag | imm_bits
            }
            Instruction::Br(cond, offset) => {
                let opcode = 0b0000u16 << 12;
                let n = if cond.n { 1u16 << 11 } else { 0 };
                let z = if cond.z { 1u16 << 10 } else { 0 };
                let p = if cond.p { 1u16 << 9 } else { 0 };
                let offset_bits = offset.0 & 0x1FF;
                opcode | n | z | p | offset_bits
            }
            Instruction::Jmp(base) => {
                let opcode = 0b1100u16 << 12;
                let base_bits = (base.to_index() as u16) << 6;
                opcode | base_bits
            }
            Instruction::Jsr(offset) => {
                let opcode = 0b0100u16 << 12;
                let flag = 1u16 << 11;
                let offset_bits = offset.0 & 0x7FF;
                opcode | flag | offset_bits
            }
            Instruction::Jsrr(base) => {
                let opcode = 0b0100u16 << 12;
                let base_bits = (base.to_index() as u16) << 6;
                opcode | base_bits
            }
            Instruction::Ldb(dr, base, offset) => {
                let opcode = 0b0010u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | dr_bits | base_bits | offset_bits
            }
            Instruction::Ldi(dr, base, offset) => {
                let opcode = 0b1010u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | dr_bits | base_bits | offset_bits
            }
            Instruction::Ldr(dr, base, offset) => {
                let opcode = 0b0110u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | dr_bits | base_bits | offset_bits
            }
            Instruction::Lea(dr, offset) => {
                let opcode = 0b1110u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let offset_bits = offset.0 & 0x1FF;
                opcode | dr_bits | offset_bits
            }
            Instruction::Not(dr, sr) => {
                let opcode = 0b1001u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr_bits = (sr.to_index() as u16) << 6;
                let ones = 0x3F; // bits [5:0] are all 1
                opcode | dr_bits | sr_bits | ones
            }
            Instruction::Ret => {
                // RET is JMP R7
                let opcode = 0b1100u16 << 12;
                let r7_bits = 7u16 << 6;
                opcode | r7_bits
            }
            Instruction::Rti => {
                0b1000u16 << 12
            }
            Instruction::Shf(dr, sr, d, a, amount) => {
                let opcode = 0b1101u16 << 12;
                let dr_bits = (dr.to_index() as u16) << 9;
                let sr_bits = (sr.to_index() as u16) << 6;
                let d_bit = if d.0 { 1u16 << 5 } else { 0 };
                let a_bit = if a.0 { 1u16 << 4 } else { 0 };
                let amount_bits = (amount.0 as u16) & 0xF;
                opcode | dr_bits | sr_bits | d_bit | a_bit | amount_bits
            }
            Instruction::Stb(sr, base, offset) => {
                let opcode = 0b0011u16 << 12;
                let sr_bits = (sr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | sr_bits | base_bits | offset_bits
            }
            Instruction::Sti(sr, base, offset) => {
                let opcode = 0b1011u16 << 12;
                let sr_bits = (sr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | sr_bits | base_bits | offset_bits
            }
            Instruction::Str(sr, base, offset) => {
                let opcode = 0b0111u16 << 12;
                let sr_bits = (sr.to_index() as u16) << 9;
                let base_bits = (base.to_index() as u16) << 6;
                let offset_bits = (offset.0 as u16) & 0x3F;
                opcode | sr_bits | base_bits | offset_bits
            }
            Instruction::Trap(vect) => {
                let opcode = 0b1111u16 << 12;
                let vect_bits = vect.0 as u16;
                opcode | vect_bits
            }
        }
    }
}

impl From<&Instruction> for [u8; 2] {
    fn from(value: &Instruction) -> Self {
        let word: u16 = value.into();
        word.to_be_bytes()
    }
}

impl TryFrom<u16> for Instruction {
    type Error = DecodeError;

    fn try_from(word: u16) -> Result<Self, Self::Error> {
        let opcode = (word >> 12) & 0xF;

        match opcode {
            0b0001 => {
                // ADD
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let sr1 = Register::from_index(((word >> 6) & 0x7) as u8);
                let imm_flag = (word >> 5) & 0x1;

                if imm_flag == 1 {
                    let imm5 = Immediate5((word & 0x1F) as u8);
                    Ok(Instruction::AddInstruction(AddInstruction::AddImm(dr, sr1, imm5)))
                } else {
                    let sr2 = Register::from_index((word & 0x7) as u8);
                    Ok(Instruction::AddInstruction(AddInstruction::AddReg(dr, sr1, sr2)))
                }
            }
            0b0101 => {
                // AND
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let sr1 = Register::from_index(((word >> 6) & 0x7) as u8);
                let imm_flag = (word >> 5) & 0x1;

                if imm_flag == 1 {
                    let imm5 = Immediate5((word & 0x1F) as u8);
                    Ok(Instruction::AndInstruction(AndInstruction::AndImm(dr, sr1, imm5)))
                } else {
                    let sr2 = Register::from_index((word & 0x7) as u8);
                    Ok(Instruction::AndInstruction(AndInstruction::AndReg(dr, sr1, sr2)))
                }
            }
            0b0000 => {
                // BR
                let n = (word >> 11) & 0x1 == 1;
                let z = (word >> 10) & 0x1 == 1;
                let p = (word >> 9) & 0x1 == 1;
                let offset = PCOffset9(word & 0x1FF);
                Ok(Instruction::Br(Condition { n, z, p }, offset))
            }
            0b1100 => {
                // JMP / RET
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                if base.to_index() == 7 {
                    Ok(Instruction::Ret)
                } else {
                    Ok(Instruction::Jmp(base))
                }
            }
            0b0100 => {
                // JSR / JSRR
                let flag = (word >> 11) & 0x1;
                if flag == 1 {
                    let offset = PCOffset11(word & 0x7FF);
                    Ok(Instruction::Jsr(offset))
                } else {
                    let base = Register::from_index(((word >> 6) & 0x7) as u8);
                    Ok(Instruction::Jsrr(base))
                }
            }
            0b0010 => {
                // LDB
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Ldb(dr, base, offset))
            }
            0b1010 => {
                // LDI
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Ldi(dr, base, offset))
            }
            0b0110 => {
                // LDR
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Ldr(dr, base, offset))
            }
            0b1110 => {
                // LEA
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let offset = PCOffset9(word & 0x1FF);
                Ok(Instruction::Lea(dr, offset))
            }
            0b1001 => {
                // NOT
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let sr = Register::from_index(((word >> 6) & 0x7) as u8);
                Ok(Instruction::Not(dr, sr))
            }
            0b1000 => {
                // RTI
                Ok(Instruction::Rti)
            }
            0b1101 => {
                // SHF
                let dr = Register::from_index(((word >> 9) & 0x7) as u8);
                let sr = Register::from_index(((word >> 6) & 0x7) as u8);
                let d = Bit((word >> 5) & 0x1 == 1);
                let a = Bit((word >> 4) & 0x1 == 1);
                let amount = Immediate4((word & 0xF) as u8);
                Ok(Instruction::Shf(dr, sr, d, a, amount))
            }
            0b0011 => {
                // STB
                let sr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Stb(sr, base, offset))
            }
            0b1011 => {
                // STI
                let sr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Sti(sr, base, offset))
            }
            0b0111 => {
                // STR
                let sr = Register::from_index(((word >> 9) & 0x7) as u8);
                let base = Register::from_index(((word >> 6) & 0x7) as u8);
                let offset = PCOffset6((word & 0x3F) as u8);
                Ok(Instruction::Str(sr, base, offset))
            }
            0b1111 => {
                // TRAP
                let vect = TrapVect8((word & 0xFF) as u8);
                Ok(Instruction::Trap(vect))
            }
            _ => Err(DecodeError {
                word,
                reason: format!("Unknown opcode: {:04b}", opcode),
            }),
        }
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum AddInstruction {
    AddReg(Register, Register, Register),
    AddImm(Register, Register, Immediate5),
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum AndInstruction {
    AndReg(Register, Register, Register),
    AndImm(Register, Register, Immediate5),
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Immediate5(pub(crate) u8);

impl Immediate5 {
    pub fn new(imm5: u8) -> eyre::Result<Self> {
        if imm5 >= 32 {
            return Err(eyre::eyre!("value `{}` too large, must be < 32", imm5));
        }

        Ok(Immediate5(imm5))
    }

    /// Create from a signed value (-16 to 15)
    pub fn from_signed(value: i8) -> eyre::Result<Self> {
        if value < -16 || value > 15 {
            return Err(eyre::eyre!(
                "Immediate5 value {} out of range (-16 to 15)",
                value
            ));
        }
        // Store as 5-bit value
        Ok(Immediate5((value as u8) & 0x1F))
    }

    pub fn value(&self) -> u8 {
        self.0
    }
}

impl FromStr for Immediate5 {
    type Err = eyre::Report;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // Strip optional # prefix
        let s = s.strip_prefix('#').unwrap_or(s);
        let value: i8 = s.parse()?;
        Self::from_signed(value)
    }
}

impl Immediate5 {
    pub fn to_value(&self) -> u16 {
        self.0 as u16
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Immediate4(pub u8);

impl Immediate4 {
    pub fn new(val: u8) -> eyre::Result<Self> {
        if val >= 16 {
            return Err(eyre::eyre!("value `{}` too large, must be < 16", val));
        }

        Ok(Immediate4(val))
    }
}

#[derive(Debug, Default, PartialEq, Clone, Copy)]
pub struct Condition {
    pub n: bool,
    pub z: bool,
    pub p: bool,
}

impl std::ops::BitAnd for Condition {
    type Output = bool;

    /// Returns true if any condition flag matches between self and rhs
    fn bitand(self, rhs: Self) -> bool {
        (self.n && rhs.n) || (self.z && rhs.z) || (self.p && rhs.p)
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset9(pub u16);

impl PCOffset9 {
    pub fn new(value: i16) -> Self {
        // Store as 9-bit value (sign-extended when used)
        PCOffset9((value as u16) & 0x1FF)
    }

    /// Sign-extend the 9-bit offset to 16 bits
    pub fn sign_extend(&self) -> i16 {
        if self.0 & 0x100 != 0 {
            // Negative: sign-extend with 1s
            (self.0 | 0xFE00) as i16
        } else {
            self.0 as i16
        }
    }
}

impl FromStr for PCOffset9 {
    type Err = eyre::Report;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // Strip optional # prefix
        let s = s.strip_prefix('#').unwrap_or(s);
        let value: i16 = s.parse()?;
        // Check range: -256 to 255 (9-bit signed)
        if value < -256 || value > 255 {
            return Err(eyre::eyre!("PCOffset9 value {} out of range (-256 to 255)", value));
        }
        Ok(PCOffset9::new(value))
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset11(pub u16);

impl PCOffset11 {
    pub fn new(value: i16) -> Self {
        // Store as 11-bit value (sign-extended when used)
        PCOffset11((value as u16) & 0x7FF)
    }

    /// Sign-extend the 11-bit offset to 16 bits
    pub fn sign_extend(&self) -> i16 {
        if self.0 & 0x400 != 0 {
            // Negative: sign-extend with 1s
            (self.0 | 0xF800) as i16
        } else {
            self.0 as i16
        }
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset6(u8);

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Bit(bool);

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct TrapVect8(pub u8);

impl TrapVect8 {
    pub fn new(value: u8) -> Self {
        TrapVect8(value)
    }

    pub fn value(&self) -> u8 {
        self.0
    }
}
