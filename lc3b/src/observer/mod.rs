mod ui;

pub use ui::UIObserver;

use lc3b_isa::{Condition, Instruction};

/// Observer for computer state changes
/// All methods have default no-op implementations
pub trait Observer {
    /// Called when a register is written
    fn on_register_write(&mut self, _reg: u8, _old: u16, _new: u16) {}

    /// Called when memory is written
    fn on_memory_write(&mut self, _addr: u16, _old: u16, _new: u16) {}

    /// Called when PC changes
    fn on_pc_change(&mut self, _old: u16, _new: u16) {}

    /// Called when condition codes change
    fn on_condition_change(&mut self, _cond: Condition) {}

    /// Called before instruction executes (useful for tracing)
    fn on_instruction_start(&mut self, _pc: u16, _inst: &Instruction) {}

    /// Called after instruction completes
    fn on_instruction_end(&mut self, _pc: u16, _inst: &Instruction) {}
}

/// No-op observer - does nothing, optimizes away
impl Observer for () {}
