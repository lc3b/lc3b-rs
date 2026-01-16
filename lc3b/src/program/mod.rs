use lc3b_isa::Instruction;

#[derive(Debug)]
pub struct Program {
    pub instructions: Vec<Instruction>,
}

impl Program {
    pub fn from_assembly(program: &str) -> Result<Program, crate::Error> {
        let instructions = lc3b_assembler::parse_to_program(program)
            .map_err(|e| crate::Error::ParseAssembly(format!("{:?}", e)))?;
        Ok(Program { instructions })
    }

    /// Encode all instructions as u16 words
    pub fn to_words(&self) -> Vec<u16> {
        self.instructions.iter().map(|inst| inst.into()).collect()
    }
}

#[cfg(test)]
mod tests {
    use lc3b_isa::Instruction;

    #[test]
    fn parse_two_line_program() {
        let program = r#"ADD R1, R2, 10; this is a program
ADD R2, R3, 30; blaha"#;
        super::Program::from_assembly(program).unwrap();
    }

    #[test]
    fn encode_program_to_words() {
        let program = r#"ADD R1, R2, 0; R1 = R2 + R0
ADD R3, R1, 5; R3 = R1 + 5"#;
        let prog = super::Program::from_assembly(program).unwrap();
        let words = prog.to_words();
        
        assert_eq!(words.len(), 2);
        
        // Verify we can decode back
        let decoded0 = Instruction::try_from(words[0]).unwrap();
        let decoded1 = Instruction::try_from(words[1]).unwrap();
        
        assert_eq!(decoded0, prog.instructions[0]);
        assert_eq!(decoded1, prog.instructions[1]);
    }
}
