//! Test cases for LEA instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LEA R4, TARGET ; R4 <- address of TARGET

use lc3b_assembler::parse_to_program;

// Note: LEA is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "LEA instruction not yet implemented in assembler"]
fn test_lea() {
    // LEA R4, TARGET ; R4 <- address of TARGET
    let asm = r#"
        LEA R4, TARGET
        ADD R0, R0, #0
TARGET: ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 3);
    // LEA is at address 0, TARGET is at address 2
    // offset = 2 - (0 + 1) = 1
    // Expected: Lea(Register4, PCOffset9::new(1))
}

#[test]
#[ignore = "LEA instruction not yet implemented in assembler"]
fn test_lea_encoding() {
    // LEA R4, TARGET with offset 1 should encode as:
    // 1110 100 000000001
    // opcode=1110, DR=100 (R4), PCoffset9=000000001
    let asm = r#"
        LEA R4, TARGET
        ADD R0, R0, #0
TARGET: ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1110_100_000000001);
}
