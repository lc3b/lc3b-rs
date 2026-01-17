//! Test cases for BR instruction from LC-3b ISA Appendix A
//!
//! Examples from the specification:
//! - BRzp LOOP ; Branch to LOOP if the last result was zero or positive.
//! - BR NEXT   ; Unconditionally Branch to NEXT.

use lc3b_assembler::parse_to_program;
use lc3b_isa::{Condition, Instruction, PCOffset9};

#[test]
fn test_br_zp_forward() {
    // BRzp LOOP ; Branch to LOOP if zero or positive
    // LOOP is 1 instruction ahead
    let asm = r#"
        BRzp LOOP
LOOP:   ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 2);
    // From address 0, LOOP is at address 1
    // offset = 1 - (0 + 1) = 0
    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: false, z: true, p: true },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_br_unconditional() {
    // BR NEXT ; Unconditionally Branch to NEXT (same as BRnzp)
    let asm = r#"
        BR NEXT
        ADD R1, R1, #1
NEXT:   ADD R2, R2, #2
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 3);
    // BR is at address 0, NEXT is at address 2
    // offset = 2 - (0 + 1) = 1
    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: true, z: true, p: true },
            PCOffset9::new(1)
        )
    );
}

#[test]
fn test_brn() {
    // BRn - branch if negative
    let asm = r#"
        BRn NEG
NEG:    ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: true, z: false, p: false },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_brz() {
    // BRz - branch if zero
    let asm = r#"
        BRz ZERO
ZERO:   ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: false, z: true, p: false },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_brp() {
    // BRp - branch if positive
    let asm = r#"
        BRp POS
POS:    ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: false, z: false, p: true },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_brnz() {
    // BRnz - branch if negative or zero
    let asm = r#"
        BRnz LABEL
LABEL:  ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: true, z: true, p: false },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_brnp() {
    // BRnp - branch if negative or positive (not zero)
    let asm = r#"
        BRnp LABEL
LABEL:  ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: true, z: false, p: true },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_brnzp() {
    // BRnzp - unconditional branch (explicit)
    let asm = r#"
        BRnzp LABEL
LABEL:  ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(
        instructions[0],
        Instruction::Br(
            Condition { n: true, z: true, p: true },
            PCOffset9::new(0)
        )
    );
}

#[test]
fn test_br_backward_reference() {
    // Test backward branch
    let asm = r#"
LOOP:   ADD R0, R0, #-1
        BRp LOOP
"#;
    let instructions = parse_to_program(asm).unwrap();

    assert_eq!(instructions.len(), 2);
    // BRp is at address 1, LOOP is at address 0
    // offset = 0 - (1 + 1) = -2
    assert_eq!(
        instructions[1],
        Instruction::Br(
            Condition { n: false, z: false, p: true },
            PCOffset9::new(-2)
        )
    );
}

#[test]
fn test_br_encoding() {
    // Test encoding of BRzp with offset 0
    // 0000 0 1 1 000000000
    // opcode=0000, n=0, z=1, p=1, PCoffset9=0
    let asm = r#"
        BRzp LABEL
LABEL:  ADD R0, R0, #0
"#;
    let instructions = parse_to_program(asm).unwrap();
    let encoded: u16 = u16::from(&instructions[0]);

    assert_eq!(encoded, 0b0000_0_1_1_000000000);
}
