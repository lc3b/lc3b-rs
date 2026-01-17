//! Test cases for LDB instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LDB R4, R2, #10 ; R4 <- SEXT(mem[R2 + 10])

use lc3b_assembler::parse_to_program;

// Note: LDB is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "LDB instruction not yet implemented in assembler"]
fn test_ldb() {
    // LDB R4, R2, #10 ; R4 <- SEXT(mem[R2 + 10])
    let asm = "LDB R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Ldb(Register4, Register2, BOffset6::new(10))
}

#[test]
#[ignore = "LDB instruction not yet implemented in assembler"]
fn test_ldb_encoding() {
    // LDB R4, R2, #10 should encode as:
    // 0010 100 010 001010
    // opcode=0010, DR=100 (R4), BaseR=010 (R2), boffset6=001010 (10)
    let asm = "LDB R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0010_100_010_001010);
}

#[test]
#[ignore = "LDB instruction not yet implemented in assembler"]
fn test_ldb_negative_offset() {
    // LDB with negative offset
    let asm = "LDB R4, R2, #-5";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Ldb(Register4, Register2, BOffset6::new(-5))
}
