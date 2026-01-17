//! Test cases for LDW instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LDW R4, R2, #10 ; R4 <- MEM[R2 + 20] (offset is doubled for word alignment)

use lc3b_assembler::parse_to_program;

// Note: LDW is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "LDW instruction not yet implemented in assembler"]
fn test_ldw() {
    // LDW R4, R2, #10 ; R4 <- MEM[R2 + 20]
    let asm = "LDW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Ldr(Register4, Register2, Offset6::new(10))
}

#[test]
#[ignore = "LDW instruction not yet implemented in assembler"]
fn test_ldw_encoding() {
    // LDW R4, R2, #10 should encode as:
    // 0110 100 010 001010
    // opcode=0110, DR=100 (R4), BaseR=010 (R2), offset6=001010 (10)
    let asm = "LDW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0110_100_010_001010);
}
