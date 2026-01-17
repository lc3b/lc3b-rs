//! Test cases for SHF (shift) instructions from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LSHF R2, R3, #3  ; R2 <- LSHF(R3, #3) - left shift
//! - RSHFL R2, R3, #7 ; R2 <- RSHF(R3, #7, 0) - right shift logical
//! - RSHFA R2, R3, #7 ; R2 <- RSHF(R3, #7, R3[15]) - right shift arithmetic

use lc3b_assembler::parse_to_program;

// Note: SHF instructions are not yet implemented in the assembler, so these tests are marked
// as ignored until support is added.

#[test]
#[ignore = "LSHF instruction not yet implemented in assembler"]
fn test_lshf() {
    // LSHF R2, R3, #3 ; R2 <- R3 << 3
    let asm = "LSHF R2, R3, #3";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Shf(Register2, Register3, 0, 0, Amount4::new(3))
}

#[test]
#[ignore = "LSHF instruction not yet implemented in assembler"]
fn test_lshf_encoding() {
    // LSHF R2, R3, #3 should encode as:
    // 1101 010 011 0 0 0011
    // opcode=1101, DR=010 (R2), SR=011 (R3), bit[4]=0 (left), bit[5]=0, amount4=0011
    let asm = "LSHF R2, R3, #3";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1101_010_011_0_0_0011);
}

#[test]
#[ignore = "RSHFL instruction not yet implemented in assembler"]
fn test_rshfl() {
    // RSHFL R2, R3, #7 ; R2 <- R3 >>> 7 (logical right shift)
    let asm = "RSHFL R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Shf(Register2, Register3, 1, 0, Amount4::new(7))
}

#[test]
#[ignore = "RSHFL instruction not yet implemented in assembler"]
fn test_rshfl_encoding() {
    // RSHFL R2, R3, #7 should encode as:
    // 1101 010 011 0 1 0111
    // opcode=1101, DR=010 (R2), SR=011 (R3), bit[4]=1 (right), bit[5]=0 (logical), amount4=0111
    let asm = "RSHFL R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1101_010_011_0_1_0111);
}

#[test]
#[ignore = "RSHFA instruction not yet implemented in assembler"]
fn test_rshfa() {
    // RSHFA R2, R3, #7 ; R2 <- R3 >> 7 (arithmetic right shift)
    let asm = "RSHFA R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Shf(Register2, Register3, 1, 1, Amount4::new(7))
}

#[test]
#[ignore = "RSHFA instruction not yet implemented in assembler"]
fn test_rshfa_encoding() {
    // RSHFA R2, R3, #7 should encode as:
    // 1101 010 011 1 1 0111
    // opcode=1101, DR=010 (R2), SR=011 (R3), bit[4]=1 (right), bit[5]=1 (arith), amount4=0111
    let asm = "RSHFA R2, R3, #7";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1101_010_011_1_1_0111);
}
