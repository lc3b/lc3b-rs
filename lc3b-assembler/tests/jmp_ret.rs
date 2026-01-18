//! Test cases for JMP and RET instructions from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - JMP R2 ; PC <- R2
//! - RET    ; PC <- R7

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Instruction, Register};

#[test]
fn test_jmp() {
    // JMP R2 ; PC <- R2
    let asm = "JMP R2";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::Jmp(Register::Register2)
    );
}

#[test]
fn test_jmp_encoding() {
    // JMP R2 should encode as:
    // 1100 000 010 000000
    // opcode=1100, unused=000, BaseR=010 (R2), unused=000000
    let asm = "JMP R2";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1100_000_010_000000);
}

#[test]
fn test_ret() {
    // RET ; PC <- R7
    let asm = "RET";
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 1);
    assert_eq!(
        instructions[0],
        Instruction::Ret
    );
}

#[test]
fn test_ret_encoding() {
    // RET should encode as:
    // 1100 000 111 000000
    // opcode=1100, unused=000, BaseR=111 (R7), unused=000000
    let asm = "RET";
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1100_000_111_000000);
}
