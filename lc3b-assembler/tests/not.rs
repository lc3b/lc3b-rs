//! Test cases for NOT instruction from LC-3b ISA Appendix A
//!
//! NOT is encoded as XOR with immediate -1 (0x1F = all 1s, sign-extended to 0xFFFF)
//!
//! Examples from the specification:
//! - NOT R4, R2 ; R4 <- NOT(R2)

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Immediate5, Instruction, Register, XorInstruction};

#[test]
fn test_not() {
    // NOT R4, R2 ; R4 <- NOT(R2)
    // Encoded as XOR R4, R2, #-1
    let asm = "NOT R4, R2";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::XorInstruction(XorInstruction::XorImm(
            Register::Register4, // DR
            Register::Register2, // SR
            Immediate5::from_signed(-1).unwrap(),
        ))
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
    // Encoded as XOR R3, R3, #-1
    let asm = "NOT R3, R3";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::XorInstruction(XorInstruction::XorImm(
            Register::Register3,
            Register::Register3,
            Immediate5::from_signed(-1).unwrap(),
        ))
    );
}
