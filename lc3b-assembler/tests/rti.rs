//! Test cases for RTI instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - RTI ; PC, PSR <- top two values popped off the stack

use lc3b_assembler::parse_to_program;

// Note: RTI is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "RTI instruction not yet implemented in assembler"]
fn test_rti() {
    // RTI ; Return from interrupt
    let asm = "RTI";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Rti
}

#[test]
#[ignore = "RTI instruction not yet implemented in assembler"]
fn test_rti_encoding() {
    // RTI should encode as:
    // 1000 000000000000
    // opcode=1000, unused=000000000000
    let asm = "RTI";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1000_000000000000);
}
