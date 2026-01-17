//! Test cases for STW instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - STW R4, R2, #10 ; MEM[R2 + 20] <- R4 (offset is doubled for word alignment)

use lc3b_assembler::parse_to_program;

// Note: STW is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "STW instruction not yet implemented in assembler"]
fn test_stw() {
    // STW R4, R2, #10 ; MEM[R2 + 20] <- R4
    let asm = "STW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Str(Register4, Register2, Offset6::new(10))
}

#[test]
#[ignore = "STW instruction not yet implemented in assembler"]
fn test_stw_encoding() {
    // STW R4, R2, #10 should encode as:
    // 0111 100 010 001010
    // opcode=0111, SR=100 (R4), BaseR=010 (R2), offset6=001010 (10)
    let asm = "STW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0111_100_010_001010);
}
