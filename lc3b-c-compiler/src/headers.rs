//! Standard header files for the LC-3b C compiler

/// An available header file
#[derive(Debug, Clone)]
pub struct Header {
    /// The header file name (e.g., "lc3b-io.h")
    pub name: &'static str,
    /// The header file contents
    pub contents: &'static str,
}

/// Returns the list of available header files that can be #included
pub fn available_headers() -> Vec<Header> {
    vec![
        Header {
            name: "lc3b-io.h",
            contents: LC3B_IO_H,
        },
    ]
}

/// Look up a header by name
pub fn get_header(name: &str) -> Option<&'static str> {
    match name {
        "lc3b-io.h" => Some(LC3B_IO_H),
        _ => None,
    }
}

/// LC-3b I/O header - provides putchar, getchar, puts, halt
const LC3B_IO_H: &str = r#"
// lc3b-io.h - LC-3b I/O functions
// These map directly to LC-3b TRAP routines

// TRAP vectors
// x20 = GETC  - Read character into R0
// x21 = OUT   - Write character from R0
// x22 = PUTS  - Write string at address in R0
// x23 = IN    - Print prompt, read character into R0
// x24 = PUTSP - Write packed string
// x25 = HALT  - Halt the machine

// Read a character from keyboard (no echo)
// Returns: the character read
char getchar() {
    trap(0x20);
}

// Write a character to the console
// Parameter c: the character to write (in R0)
void putchar(char c) {
    trap(0x21);
}

// Write a null-terminated string to the console
// Parameter s: pointer to the string (in R0)
void puts(char* s) {
    trap(0x22);
}

// Halt the machine
void halt() {
    trap(0x25);
}
"#;
