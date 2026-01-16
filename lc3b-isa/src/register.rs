use std::str::FromStr;

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Register {
    Register0,
    Register1,
    Register2,
    Register3,
    Register4,
    Register5,
    Register6,
    Register7,
}

impl FromStr for Register {
    type Err = eyre::Report;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let reg = match s {
            "r0" | "R0" => Register::Register0,
            "r1" | "R1" => Register::Register1,
            "r2" | "R2" => Register::Register2,
            "r3" | "R3" => Register::Register3,
            "r4" | "R4" => Register::Register4,
            "r5" | "R5" => Register::Register5,
            "r6" | "R6" => Register::Register6,
            "r7" | "R7" => Register::Register7,
            unknown => return Err(eyre::eyre!("unhandled register identifier: {}", unknown)),
        };

        Ok(reg)
    }
}

impl Register {
    pub fn to_index(&self) -> usize {
        match *self {
            Register::Register0 => 0,
            Register::Register1 => 1,
            Register::Register2 => 2,
            Register::Register3 => 3,
            Register::Register4 => 4,
            Register::Register5 => 5,
            Register::Register6 => 6,
            Register::Register7 => 7,
        }
    }

    pub fn from_index(index: u8) -> Self {
        match index & 0b111 {
            0 => Register::Register0,
            1 => Register::Register1,
            2 => Register::Register2,
            3 => Register::Register3,
            4 => Register::Register4,
            5 => Register::Register5,
            6 => Register::Register6,
            7 => Register::Register7,
            _ => unreachable!(),
        }
    }
}
