//! Test cases for NOT instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - NOT R4, R2 ; R4 <- NOT(R2)

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Instruction, Register};

#[test]
fn test_not() {
    // NOT R4, R2 ; R4 <- NOT(R2)
    let asm = "NOT R4, R2";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::Not(
            Register::Register4, // DR
            Register::Register2, // SR
        )
    );
}

#[test]
fn test_not_encoding() {
    // Verify the encoding is correct
    // NOT R4, R2 should encode as:
    // 1001 100 010 1 11111
    // opcode=1001, DR=100 (R4), SR=010 (R2), mode=1, imm5=11111
    let asm = "NOT R4, R2";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1001_100_010_1_11111);
}

#[test]
fn test_not_same_register() {
    // NOT R3, R3 ; R3 <- NOT(R3)
    let asm = "NOT R3, R3";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::Not(
            Register::Register3,
            Register::Register3,
        )
    );
}
