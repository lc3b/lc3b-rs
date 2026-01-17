//! Test cases for JSR and JSRR instructions from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - JSR QUEUE ; Put address of instruction following JSR into R7; Jump to QUEUE
//! - JSRR R3   ; Put address following JSRR into R7; Jump to address in R3

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Instruction, Register};

#[test]
fn test_jsr() {
    // JSR QUEUE ; Jump to subroutine at QUEUE
    let asm = r#"
        JSR QUEUE
        ADD R0, R0, #0
QUEUE:  ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 3);
    // JSR is at address 0, QUEUE is at address 2
    // offset = 2 - (0 + 1) = 1
    // Expected: Jsr(PCOffset11::new(1))
}

#[test]
fn test_jsr_encoding() {
    // JSR with offset 1 should encode as:
    // 0100 1 00000000001
    // opcode=0100, mode=1, PCoffset11=1
    let asm = r#"
        JSR QUEUE
        ADD R0, R0, #0
QUEUE:  ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0100_1_00000000001);
}

#[test]
fn test_jsrr() {
    // JSRR R3 ; Jump to address in R3
    let asm = "JSRR R3";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::Jsrr(Register::Register3)
    );
}

#[test]
fn test_jsrr_encoding() {
    // JSRR R3 should encode as:
    // 0100 0 00 011 000000
    // opcode=0100, mode=0, unused=00, BaseR=011 (R3), unused=000000
    let asm = "JSRR R3";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0100_0_00_011_000000);
}
