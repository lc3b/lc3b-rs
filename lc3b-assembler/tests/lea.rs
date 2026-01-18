//! Test cases for LEA instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - LEA R4, TARGET ; R4 <- address of TARGET

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Instruction, PCOffset9, Register};

#[test]
fn test_lea() {
    // LEA R4, TARGET ; R4 <- address of TARGET
    // Layout: LEA at 0, padding at 1, padding at 2, TARGET at 3
    // Raw offset = 3 - (0 + 1) = 2, stored offset = 2 / 2 = 1
    let asm = r#"
        LEA R4, TARGET
        ADD R0, R0, #0
        ADD R0, R0, #0
TARGET: ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 4);
    // Stored offset = 1 (raw offset 2 divided by 2)
    assert_eq!(
        instructions[0],
        Instruction::Lea(Register::Register4, PCOffset9::new(1))
    );
}

#[test]
fn test_lea_encoding() {
    // LEA R4, TARGET with stored offset 1 should encode as:
    // 1110 100 000000001
    // opcode=1110, DR=100 (R4), PCoffset9=000000001
    // Layout: LEA at 0, padding at 1, padding at 2, TARGET at 3
    // Raw offset = 2, stored = 1
    let asm = r#"
        LEA R4, TARGET
        ADD R0, R0, #0
        ADD R0, R0, #0
TARGET: ADD R1, R1, #1
"#;
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b1110_100_000000001);
}
