//! Test cases for ADD instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - ADD R2, R3, R4 ; R2 <- R3 + R4
//! - ADD R2, R3, #7 ; R2 <- R3 + 7

use lc3b_assembler::parse_to_program;
use lc3b_isa::{AddInstruction, Immediate5, Instruction, Register};

#[test]
fn test_add_register_mode() {
    // ADD R2, R3, R4 ; R2 <- R3 + R4
    let asm = "ADD R2, R3, R4";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::AddInstruction(AddInstruction::AddReg(
            Register::Register2, // DR
            Register::Register3, // SR1
            Register::Register4, // SR2
        ))
    );
}

#[test]
fn test_add_immediate_mode() {
    // ADD R2, R3, #7 ; R2 <- R3 + 7
    let asm = "ADD R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::AddInstruction(AddInstruction::AddImm(
            Register::Register2, // DR
            Register::Register3, // SR1
            Immediate5::new(7).unwrap(),
        ))
    );
}

#[test]
fn test_add_encoding_register_mode() {
    // Verify the encoding is correct
    // ADD R2, R3, R4 should encode as:
    // 0001 010 011 000 100
    // opcode=0001, DR=010 (R2), SR1=011 (R3), mode=000, SR2=100 (R4)
    let asm = "ADD R2, R3, R4";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    // 0001 010 011 000 100 = 0x1CC4
    assert_eq!(encoded, 0b0001_010_011_000_100);
}

#[test]
fn test_add_encoding_immediate_mode() {
    // Verify the encoding is correct
    // ADD R2, R3, #7 should encode as:
    // 0001 010 011 1 00111
    // opcode=0001, DR=010 (R2), SR1=011 (R3), mode=1, imm5=00111
    let asm = "ADD R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    // 0001 010 011 1 00111 = 0x14E7
    assert_eq!(encoded, 0b0001_010_011_1_00111);
}

#[test]
fn test_add_negative_immediate() {
    // Test negative immediate value
    let asm = "ADD R1, R1, #-1";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::AddInstruction(AddInstruction::AddImm(
            Register::Register1,
            Register::Register1,
            Immediate5::from_str("-1").unwrap(),
        ))
    );
}

use std::str::FromStr;
