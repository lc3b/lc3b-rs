//! Tests for assembler directives (.ORIG, .END, .FILL, .BLKW, .STRINGZ)

use lc3b_assembler::assemble;

#[test]
fn test_orig_directive() {
    let test_asm = r#"
.ORIG x4000
    ADD R0, R0, #1
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.origin, 0x4000);
    assert_eq!(assembled.words.len(), 1);
}

#[test]
fn test_orig_default() {
    // Without .ORIG, default origin should be 0x3000
    let test_asm = r#"
    ADD R0, R0, #1
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.origin, 0x3000);
}

#[test]
fn test_end_directive() {
    let test_asm = r#"
.ORIG x3000
    ADD R0, R0, #1
.END
    ADD R1, R1, #2
"#;

    let assembled = assemble(test_asm).unwrap();
    // Should only have 1 instruction - .END stops assembly
    assert_eq!(assembled.words.len(), 1);
}

#[test]
fn test_fill_hex() {
    let test_asm = r#"
.ORIG x3000
DATA:   .FILL x1234
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 1);
    assert_eq!(assembled.words[0], 0x1234);
}

#[test]
fn test_fill_decimal() {
    let test_asm = r#"
.ORIG x3000
    .FILL #100
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words[0], 100);
}

#[test]
fn test_fill_negative() {
    let test_asm = r#"
.ORIG x3000
    .FILL #-1
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words[0], 0xFFFF); // -1 as u16
}

#[test]
fn test_fill_with_label() {
    let test_asm = r#"
.ORIG x3000
    ADD R0, R0, #1
PTR:    .FILL DATA
DATA:   .FILL x1234
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 3);
    // PTR should contain the address of DATA (x3002)
    assert_eq!(assembled.words[1], 0x3002);
    assert_eq!(assembled.words[2], 0x1234);
}

#[test]
fn test_blkw_directive() {
    let test_asm = r#"
.ORIG x3000
    ADD R0, R0, #1
ARRAY:  .BLKW #5
    ADD R1, R1, #2
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 7); // 1 + 5 + 1
    // BLKW should fill with zeros
    for i in 1..6 {
        assert_eq!(assembled.words[i], 0);
    }
}

#[test]
fn test_blkw_hex() {
    let test_asm = r#"
.ORIG x3000
    .BLKW x10
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 16); // 0x10 = 16
}

#[test]
fn test_stringz_directive() {
    let test_asm = r#"
.ORIG x3000
HELLO:  .STRINGZ "Hi"
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 3); // 'H', 'i', 0
    assert_eq!(assembled.words[0], 'H' as u16);
    assert_eq!(assembled.words[1], 'i' as u16);
    assert_eq!(assembled.words[2], 0); // null terminator
}

#[test]
fn test_stringz_empty() {
    let test_asm = r#"
.ORIG x3000
    .STRINGZ ""
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 1); // just null terminator
    assert_eq!(assembled.words[0], 0);
}

#[test]
fn test_stringz_longer() {
    let test_asm = r#"
.ORIG x3000
    .STRINGZ "Hello, World!"
"#;

    let assembled = assemble(test_asm).unwrap();
    assert_eq!(assembled.words.len(), 14); // 13 chars + null
    assert_eq!(assembled.words[0], 'H' as u16);
    assert_eq!(assembled.words[12], '!' as u16);
    assert_eq!(assembled.words[13], 0);
}

#[test]
fn test_combined_directives() {
    let test_asm = r#"
.ORIG x3000
    ADD R0, R0, #1
MSG:    .STRINGZ "AB"
ARRAY:  .BLKW #2
DATA:   .FILL x5678
.END
"#;

    let assembled = assemble(test_asm).unwrap();
    // 1 instruction + 3 string chars (A, B, null) + 2 zeros + 1 fill = 7
    assert_eq!(assembled.words.len(), 7);
    assert_eq!(assembled.words[1], 'A' as u16);
    assert_eq!(assembled.words[2], 'B' as u16);
    assert_eq!(assembled.words[3], 0); // null terminator
    assert_eq!(assembled.words[4], 0); // BLKW
    assert_eq!(assembled.words[5], 0); // BLKW
    assert_eq!(assembled.words[6], 0x5678); // FILL
}
