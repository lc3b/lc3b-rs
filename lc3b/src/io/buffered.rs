use std::collections::VecDeque;

use super::IO;

/// Buffered I/O for WASM and testing
/// Collects output in a string, accepts input from a queue
pub struct BufferedIO {
    output: String,
    input: VecDeque<char>,
    halted: bool,
}

impl BufferedIO {
    pub fn new() -> Self {
        Self {
            output: String::new(),
            input: VecDeque::new(),
            halted: false,
        }
    }

    /// Get all output written so far
    pub fn output(&self) -> &str {
        &self.output
    }

    /// Clear output buffer
    pub fn clear_output(&mut self) {
        self.output.clear();
    }

    /// Queue input characters (for testing or WASM keyboard input)
    pub fn push_input(&mut self, ch: char) {
        self.input.push_back(ch);
    }

    /// Queue a string as input
    pub fn push_input_str(&mut self, s: &str) {
        for ch in s.chars() {
            self.input.push_back(ch);
        }
    }

    /// Reset halted state (to rerun)
    pub fn reset(&mut self) {
        self.halted = false;
        self.output.clear();
        self.input.clear();
    }
}

impl Default for BufferedIO {
    fn default() -> Self {
        Self::new()
    }
}

impl IO for BufferedIO {
    fn write_char(&mut self, ch: char) {
        self.output.push(ch);
    }

    fn read_char(&mut self) -> Option<char> {
        self.input.pop_front()
    }

    fn halt(&mut self) {
        self.halted = true;
    }

    fn is_halted(&self) -> bool {
        self.halted
    }
}
