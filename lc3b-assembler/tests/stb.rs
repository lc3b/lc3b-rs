//! Test cases for STB instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - STB R4, R2, #10 ; mem[R2 + 10] <- R4[7:0]

use lc3b_assembler::parse_to_program;

// Note: STB is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "STB instruction not yet implemented in assembler"]
fn test_stb() {
    // STB R4, R2, #10 ; mem[R2 + 10] <- R4[7:0]
    let asm = "STB R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Stb(Register4, Register2, BOffset6::new(10))
}

#[test]
#[ignore = "STB instruction not yet implemented in assembler"]
fn test_stb_encoding() {
    // STB R4, R2, #10 should encode as:
    // 0011 100 010 001010
    // opcode=0011, SR=100 (R4), BaseR=010 (R2), boffset6=001010 (10)
    let asm = "STB R4, R2, #10";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0011_100_010_001010);
}
