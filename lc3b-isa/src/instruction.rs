#![allow(dead_code)]

use std::str::FromStr;

use crate::Register;

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

impl From<&Instruction> for [u8; 2] {
    fn from(value: &Instruction) -> Self {
        let mut bytes = [0; 2];

        match value {
            Instruction::AddInstruction(AddInstruction::AddReg(r1, r2, r3)) => {
                bytes[0] |= 0b00010000;
                bytes[0] |= (r1.to_index() as u8) << 1;
                bytes[0] |= (r2.to_index() as u8) >> 2;

                bytes[1] |= (r2.to_index() as u8) << 6;
                bytes[1] |= (r3.to_index() as u8) << 0;
            }
            Instruction::AddInstruction(AddInstruction::AddImm(r1, r2, imm5)) => {
                bytes[0] |= 0b00010000;
                bytes[0] |= (r1.to_index() as u8) << 1;
                bytes[0] |= (r2.to_index() as u8) >> 2;

                bytes[1] |= (r2.to_index() as u8) << 6;
                bytes[1] |= 0b00100000;
                bytes[1] |= imm5.0 & 0b00011111;
            }
            other => todo!("wah: {:?}", other),
        }

        bytes
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
        assert!(imm5 < 32);
        if imm5 >= 32 {
            return Err(eyre::eyre!("value `{}` too large, must be < 32", imm5));
        }

        Ok(Immediate5(imm5))
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
        // TODO: range check
        Self::new(s.parse()?)
    }
}

impl Immediate5 {
    pub fn to_value(&self) -> u16 {
        self.0 as u16
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Immediate4(pub(crate) u8);

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
    n: bool,
    z: bool,
    p: bool,
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset9(u16);
#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset11(u16);
#[derive(Debug, PartialEq, Clone, Copy)]
pub struct PCOffset6(u8);

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Bit(bool);

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct TrapVect8(u8);
