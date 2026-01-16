use std::fmt::Debug;

mod debug;

/// LC-3b memory: 65536 addressable 16-bit words (128KB total)
/// Each address holds one 16-bit word.
pub struct Memory([u16; 65536]);

impl Default for Memory {
    fn default() -> Self {
        Memory([0; 65536])
    }
}

impl Debug for Memory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("Memory").field(&"[65536 words]").finish()
    }
}

impl Memory {
    /// Read a 16-bit word from the given address
    pub fn read_word(&self, addr: u16) -> u16 {
        self.0[addr as usize]
    }

    /// Write a 16-bit word to the given address
    pub fn write_word(&mut self, addr: u16, value: u16) {
        self.0[addr as usize] = value;
    }

    /// Load a slice of words into memory starting at the given address
    pub fn load_words(&mut self, start_addr: u16, words: &[u16]) {
        for (i, &word) in words.iter().enumerate() {
            let addr = start_addr.wrapping_add(i as u16);
            self.0[addr as usize] = word;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Memory;

    #[test]
    pub fn test_read_write() {
        let mut memory = Memory::default();
        
        memory.write_word(0x3000, 0x1234);
        assert_eq!(memory.read_word(0x3000), 0x1234);
        
        memory.write_word(0x3001, 0xABCD);
        assert_eq!(memory.read_word(0x3001), 0xABCD);
    }

    #[test]
    pub fn test_load_words() {
        let mut memory = Memory::default();
        let program = vec![0x1260, 0x12A5, 0x1642]; // Some ADD instructions
        
        memory.load_words(0x3000, &program);
        
        assert_eq!(memory.read_word(0x3000), 0x1260);
        assert_eq!(memory.read_word(0x3001), 0x12A5);
        assert_eq!(memory.read_word(0x3002), 0x1642);
    }
}
