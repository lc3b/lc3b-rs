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
//! - x24 PUTSP - Write packed string to console
//! - x25 HALT  - Halt execution

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Instruction, TrapVect8};

#[test]
fn test_trap_in() {
    // TRAP x23 ; IN system call
    let asm = "TRAP x23";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x23)));
}

#[test]
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
fn test_trap_halt() {
    // TRAP x25 ; HALT
    let asm = "TRAP x25";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x25)));
}

#[test]
fn test_trap_getc() {
    // TRAP x20 ; GETC
    let asm = "TRAP x20";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x20)));
}

// Tests for trap aliases (no operands needed)

#[test]
fn test_halt_alias() {
    let asm = "HALT";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x25)));
}

#[test]
fn test_getc_alias() {
    let asm = "GETC";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x20)));
}

#[test]
fn test_out_alias() {
    let asm = "OUT";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x21)));
}

#[test]
fn test_puts_alias() {
    let asm = "PUTS";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x22)));
}

#[test]
fn test_in_alias() {
    let asm = "IN";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x23)));
}

#[test]
fn test_putsp_alias() {
    let asm = "PUTSP";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(instructions[0], Instruction::Trap(TrapVect8::new(0x24)));
}
