//! Test cases for TRAP instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - TRAP x23 ; Execute the IN system call (starting address in memory location x0046)
//!
//! Common trap vectors:
//! - x20 GETC  - Read character from keyboard
//! - x21 OUT   - Write character to console
//! - x22 PUTS  - Write string to console
//! - x23 IN    - Print prompt and read character
//! - x25 HALT  - Halt execution

use lc3b_assembler::parse_to_program;

// Note: TRAP is not yet implemented in the assembler, so these tests are marked as ignored
// until support is added.

#[test]
#[ignore = "TRAP instruction not yet implemented in assembler"]
fn test_trap_in() {
    // TRAP x23 ; IN system call
    let asm = "TRAP x23";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Trap(TrapVect8::new(0x23))
}

#[test]
#[ignore = "TRAP instruction not yet implemented in assembler"]
fn test_trap_encoding() {
    // TRAP x23 should encode as:
    // 1111 0000 00100011
    // opcode=1111, unused=0000, trapvect8=00100011 (0x23)
    let asm = "TRAP x23";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1111_0000_00100011);
}

#[test]
#[ignore = "TRAP instruction not yet implemented in assembler"]
fn test_trap_halt() {
    // TRAP x25 ; HALT
    let asm = "TRAP x25";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Trap(TrapVect8::new(0x25))
}

#[test]
#[ignore = "TRAP instruction not yet implemented in assembler"]
fn test_trap_getc() {
    // TRAP x20 ; GETC
    let asm = "TRAP x20";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    // Expected: Trap(TrapVect8::new(0x20))
}
