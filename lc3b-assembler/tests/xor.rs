//! Test cases for XOR instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - XOR R3, R1, R2  ; R3 <- R1 XOR R2
//! - XOR R3, R1, #12 ; R3 <- R1 with bits [3], [2] complemented
//! - NOT R3, R2      ; R3 <- NOT(R2) (special case of XOR with imm5=0x1F)

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Immediate5, Instruction, Register, XorInstruction};

// Note: XOR is not yet implemented in the assembler grammar, so these tests are marked as ignored
// until XOR support is added to the grammar.

#[test]
#[ignore = "XOR instruction not yet implemented in assembler grammar"]
fn test_xor_register_mode() {
    // XOR R3, R1, R2 ; R3 <- R1 XOR R2
    let asm = "XOR R3, R1, R2";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: XOR instruction with DR=R3, SR1=R1, SR2=R2
}

#[test]
#[ignore = "XOR instruction not yet implemented in assembler grammar"]
fn test_xor_immediate_mode() {
    // XOR R3, R1, #12 ; R3 <- R1 with bits [3], [2] complemented
    let asm = "XOR R3, R1, #12";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: XOR instruction with DR=R3, SR1=R1, imm5=12
}

#[test]
fn test_not_as_xor() {
    // NOT R3, R2 is a special case of XOR R3, R2, #-1 (imm5 = 0x1F = -1)
    // The assembler should accept NOT and encode it correctly
    let asm = "NOT R3, R2";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::XorInstruction(XorInstruction::XorImm(
            Register::Register3, // DR
            Register::Register2, // SR
            Immediate5::from_signed(-1).unwrap(),
        ))
    );

    // Verify encoding: 1001 011 010 1 11111
    let encoded: u16 = u16::from(&instructions[0]);
    assert_eq!(encoded, 0b1001_011_010_1_11111);
}
