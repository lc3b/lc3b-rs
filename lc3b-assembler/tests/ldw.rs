//! Test cases for LDW instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LDW R4, R2, #10 ; R4 <- MEM[R2 + 20] (offset is doubled for word alignment)

use lc3b_assembler::parse_to_program;

#[test]
fn test_ldw() {
    // LDW R4, R2, #10 ; R4 <- MEM[R2 + 20]
    let asm = "LDW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
}

#[test]
fn test_ldw_encoding() {
    // LDW R4, R2, #10 should encode as:
    // 0110 100 010 001010
    // opcode=0110, DR=100 (R4), BaseR=010 (R2), offset6=001010 (10)
    let asm = "LDW R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0110_100_010_001010);
}
