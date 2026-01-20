use lc3b::{BufferedIO, Computer, IO};

#[test]
fn test_trap_out() {
    let mut computer = Computer::new(BufferedIO::new());

    // Build 'A' (65) using multiple ADDs, then OUT, then HALT
    let program = vec![
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 15
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 30
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 45
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 60
        0x1020 | 5,  // ADD R0, R0, #5  -> R0 = 65 = 'A'
        0xF021,      // TRAP x21 (OUT)
        0xF025,      // TRAP x25 (HALT)
    ];
    computer.load_program(&program, 0x3000);

    computer.run(100).unwrap();

    assert_eq!(computer.io().output(), "A");
    assert!(computer.io().is_halted());
}

#[test]
fn test_trap_puts() {
    let mut computer = Computer::new(BufferedIO::new());

    // Load "Hi" at address 0x4000 first
    computer.write_memory(0x4000, 'H' as u16);
    computer.write_memory(0x4001, 'i' as u16);
    computer.write_memory(0x4002, 0); // null terminator

    // Program: build address 0x4000 in R0, call PUTS, then HALT
    // 0x4000 = 16384 decimal, build it with shifts or use a different approach
    // Easier: put string right after program and use smaller address
    // Let's put string at 0x3010 and build that address

    // 0x3010 = 12304 decimal. We need to build this in R0.
    // Strategy: use multiple registers and adds
    // 0x3010 = 0x3000 + 0x10 = 12288 + 16
    // 12288 = 0x3000, which is the starting PC
    // Actually easier: put string at low address that we can build

    // Simpler approach: write string at 0x0050 (80 decimal) which we can build easily
    computer.write_memory(0x0050, 'H' as u16);
    computer.write_memory(0x0051, 'i' as u16);
    computer.write_memory(0x0052, 0); // null terminator

    // Build 80 (0x50) in R0
    let program = vec![
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 15
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 30
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 45
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 60
        0x1020 | 15, // ADD R0, R0, #15 -> R0 = 75
        0x1020 | 5,  // ADD R0, R0, #5  -> R0 = 80 = 0x50
        0xF022,      // TRAP x22 (PUTS)
        0xF025,      // TRAP x25 (HALT)
    ];
    computer.load_program(&program, 0x3000);

    computer.run(100).unwrap();

    assert_eq!(computer.io().output(), "Hi");
    assert!(computer.io().is_halted());
}

#[test]
fn test_trap_getc() {
    let mut computer = Computer::new(BufferedIO::new());
    computer.io_mut().push_input('X');

    // Program: GETC, then HALT
    let program = vec![
        0xF020, // TRAP x20 (GETC)
        0xF025, // TRAP x25 (HALT)
    ];
    computer.load_program(&program, 0x3000);

    computer.run(100).unwrap();

    assert_eq!(computer.register(0), 'X' as u16);
    assert!(computer.io().is_halted());
}

#[test]
fn test_trap_halt() {
    let mut computer = Computer::new(BufferedIO::new());

    assert!(!computer.io().is_halted());

    // Program: just HALT
    let program = vec![0xF025]; // TRAP x25 (HALT)
    computer.load_program(&program, 0x3000);

    let count = computer.run(100).unwrap();

    assert_eq!(count, 1);
    assert!(computer.io().is_halted());
}

#[test]
fn test_run_stops_at_halt() {
    let mut computer = Computer::new(BufferedIO::new());

    // Program: ADD R1, R1, #1 three times, then HALT
    let program = vec![
        0x1261, // ADD R1, R1, #1
        0x1261, // ADD R1, R1, #1
        0x1261, // ADD R1, R1, #1
        0xF025, // TRAP x25 (HALT)
    ];
    computer.load_program(&program, 0x3000);

    let count = computer.run(100).unwrap();

    assert_eq!(count, 4);
    assert_eq!(computer.register(1), 3);
    assert!(computer.io().is_halted());
}

#[test]
fn test_lea_with_puts() {
    // This test simulates the Hello World sample:
    //   LEA R0, hello
    //   PUTS
    //   HALT
    //   hello: .STRINGZ "Hi"
    //
    // Layout at x3000:
    //   x3000: LEA R0, stored_offset=1 (targets x3003)
    //   x3001: PUTS (TRAP x22)
    //   x3002: HALT (TRAP x25)
    //   x3003: 'H'
    //   x3004: 'i'
    //   x3005: 0 (null terminator)
    //
    // LEA computation: DR = PC+1 + LSHF(SEXT(offset), 1)
    //   = x3001 + (1 << 1) = x3001 + 2 = x3003

    let mut computer = Computer::new(BufferedIO::new());

    // LEA R0, PCoffset9=1
    // Opcode: 1110 (LEA), DR: 000 (R0), PCoffset9: 000000001
    // = 0b1110_000_000000001 = 0xE001
    let program = vec![
        0xE001,       // LEA R0, #1 (stored offset, actual target = PC+1 + 2 = x3003)
        0xF022,       // PUTS
        0xF025,       // HALT
        'H' as u16,   // x3003
        'i' as u16,   // x3004
        0,            // x3005 null terminator
    ];
    computer.load_program(&program, 0x3000);

    computer.run(100).unwrap();

    assert_eq!(computer.io().output(), "Hi");
    assert!(computer.io().is_halted());
}

#[test]
fn test_hello_world_sample() {
    // Test that assembles and runs the Hello World sample from samples.ts
    use lc3b_assembler::assemble;

    let code = r#"
.ORIG x3000
LEA R0, hello
PUTS
HALT
hello:
.STRINGZ "Hi"
.END
"#;

    let assembled = assemble(code).expect("Failed to assemble");
    
    // Print debug info
    println!("Origin: x{:04X}", assembled.origin);
    for (i, word) in assembled.words.iter().enumerate() {
        let addr = assembled.origin + i as u16;
        println!("  x{:04X}: x{:04X}", addr, word);
    }
    
    let mut computer = Computer::new(BufferedIO::new());
    computer.load_program(&assembled.words, assembled.origin);
    
    computer.run(100).unwrap();
    
    assert_eq!(computer.io().output(), "Hi");
    assert!(computer.io().is_halted());
}
