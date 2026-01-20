#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("could not parse assembly: {0}")]
    ParseAssembly(String),

    #[error("instruction decode error at {address:#06x}: {reason}")]
    InstructionDecode { address: u16, reason: String },

    #[error("unimplemented instruction: {0}")]
    UnimplementedInstruction(String),

    #[error("invalid memory access at {0:#06x}")]
    InvalidMemoryAccess(u16),

    #[error("undefined label: {0}")]
    UndefinedLabel(String),

    #[error("duplicate label: {0}")]
    DuplicateLabel(String),

    #[error("{kind} out of range: {value} (valid: {min} to {max})")]
    ValueOutOfRange {
        kind: &'static str,
        value: i32,
        min: i32,
        max: i32,
    },

    #[error("invalid register: {0}")]
    InvalidRegister(String),

    #[error("TRAP vector out of range: {0:#04x} (valid: 0x00 to 0xFF)")]
    TrapVectorOutOfRange(u16),

    #[error("alignment error: {0}")]
    AlignmentError(String),
}
