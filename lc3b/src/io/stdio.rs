use std::io::{self, Read, Write};

use super::IO;

/// Standard I/O for CLI usage
pub struct StdIO {
    halted: bool,
}

impl StdIO {
    pub fn new() -> Self {
        Self { halted: false }
    }
}

impl Default for StdIO {
    fn default() -> Self {
        Self::new()
    }
}

impl IO for StdIO {
    fn write_char(&mut self, ch: char) {
        print!("{}", ch);
        let _ = io::stdout().flush();
    }

    fn read_char(&mut self) -> Option<char> {
        let mut buf = [0u8; 1];
        io::stdin().read_exact(&mut buf).ok()?;
        Some(buf[0] as char)
    }

    fn halt(&mut self) {
        self.halted = true;
    }

    fn is_halted(&self) -> bool {
        self.halted
    }
}
