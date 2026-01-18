use lc3b_isa::Condition;

use super::Observer;

/// Tracks state changes for UI updates
pub struct UIObserver {
    last_modified_register: Option<u8>,
    last_modified_memory: Option<u16>,
    condition_changed: bool,
    last_condition: Condition,
}

impl UIObserver {
    pub fn new() -> Self {
        Self {
            last_modified_register: None,
            last_modified_memory: None,
            condition_changed: false,
            last_condition: Condition::default(),
        }
    }

    /// Call at start of each instruction to reset per-instruction tracking
    pub fn reset_instruction_state(&mut self) {
        self.last_modified_register = None;
        self.last_modified_memory = None;
        self.condition_changed = false;
    }

    /// Get the last modified register index (0-7), if any
    pub fn last_modified_register(&self) -> Option<u8> {
        self.last_modified_register
    }

    /// Get the last modified memory address, if any
    pub fn last_modified_memory(&self) -> Option<u16> {
        self.last_modified_memory
    }

    /// Check if condition codes changed in the last instruction
    pub fn condition_changed(&self) -> bool {
        self.condition_changed
    }

    /// Get the last condition codes
    pub fn last_condition(&self) -> Condition {
        self.last_condition
    }
}

impl Default for UIObserver {
    fn default() -> Self {
        Self::new()
    }
}

impl Observer for UIObserver {
    fn on_register_write(&mut self, reg: u8, _old: u16, _new: u16) {
        self.last_modified_register = Some(reg);
    }

    fn on_memory_write(&mut self, addr: u16, _old: u16, _new: u16) {
        self.last_modified_memory = Some(addr);
    }

    fn on_condition_change(&mut self, cond: Condition) {
        self.condition_changed = true;
        self.last_condition = cond;
    }
}
