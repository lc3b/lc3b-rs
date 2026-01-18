mod buffered;
mod stdio;

pub use buffered::BufferedIO;
pub use stdio::StdIO;

/// I/O handler for LC-3b TRAP instructions
/// Implement this trait to provide console I/O for different platforms
pub trait IO {
    /// Write a character to console (TRAP x21 - OUT)
    fn write_char(&mut self, ch: char);

    /// Write a string to console (TRAP x22 - PUTS)
    fn write_str(&mut self, s: &str) {
        for ch in s.chars() {
            self.write_char(ch);
        }
    }

    /// Read a character from input (TRAP x20 - GETC)
    /// Returns None if no input available
    fn read_char(&mut self) -> Option<char>;

    /// Prompt and read character with echo (TRAP x23 - IN)
    fn read_char_with_echo(&mut self) -> Option<char> {
        self.write_str("Input a character> ");
        if let Some(ch) = self.read_char() {
            self.write_char(ch);
            Some(ch)
        } else {
            None
        }
    }

    /// Called when HALT executes (TRAP x25)
    fn halt(&mut self);

    /// Check if halted
    fn is_halted(&self) -> bool;
}
