//! Test cases for AND instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - AND R2, R3, R4 ; R2 <- R3 AND R4
//! - AND R2, R3, #7 ; R2 <- R3 AND 7

use lc3b_assembler::parse_to_program;
use lc3b_isa::{AndInstruction, Immediate5, Instruction, Register};

#[test]
fn test_and_register_mode() {
    // AND R2, R3, R4 ; R2 <- R3 AND R4
    let asm = "AND R2, R3, R4";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::AndInstruction(AndInstruction::AndReg(
            Register::Register2, // DR
            Register::Register3, // SR1
            Register::Register4, // SR2
        ))
    );
}

#[test]
fn test_and_immediate_mode() {
    // AND R2, R3, #7 ; R2 <- R3 AND 7
    let asm = "AND R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::AndInstruction(AndInstruction::AndImm(
            Register::Register2, // DR
            Register::Register3, // SR1
            Immediate5::new(7).unwrap(),
        ))
    );
}

#[test]
fn test_and_encoding_register_mode() {
    // Verify the encoding is correct
    // AND R2, R3, R4 should encode as:
    // 0101 010 011 000 100
    // opcode=0101, DR=010 (R2), SR1=011 (R3), mode=000, SR2=100 (R4)
    let asm = "AND R2, R3, R4";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0101_010_011_000_100);
}

#[test]
fn test_and_encoding_immediate_mode() {
    // Verify the encoding is correct
    // AND R2, R3, #7 should encode as:
    // 0101 010 011 1 00111
    // opcode=0101, DR=010 (R2), SR1=011 (R3), mode=1, imm5=00111
    let asm = "AND R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0101_010_011_1_00111);
}
