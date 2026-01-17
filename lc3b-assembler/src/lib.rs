#![forbid(unsafe_code)]

use std::{collections::HashMap, str::FromStr};

use lc3b_isa::{AddInstruction, AndInstruction, Condition, Immediate5, Instruction, PCOffset9, Register};
use pest::{
    iterators::{Pair, Pairs},
    Parser,
};

#[derive(pest_derive::Parser)]
#[grammar = "lc3b_asm.pest"]
struct LC3BAsmParser {}

pub type Error = pest::error::Error<Rule>;

pub fn parse_to_pairs(program: &str) -> Result<Pairs<'_, Rule>, Box<Error>> {
    LC3BAsmParser::parse(Rule::program, program).map_err(Box::new)
}

/// Two-pass assembler that supports labels
struct Assembler {
    symbols: HashMap<String, u16>,
    current_address: u16,
}

impl Assembler {
    fn new() -> Self {
        Assembler {
            symbols: HashMap::new(),
            current_address: 0,
        }
    }

    /// Pass 1: Build symbol table by collecting all label addresses
    fn pass1(&mut self, program: &str) -> eyre::Result<()> {
        let parsed = LC3BAsmParser::parse(Rule::program, program)?
            .next()
            .unwrap();

        for pair in parsed.into_inner() {
            if pair.as_rule() == Rule::line {
                for inner in pair.into_inner() {
                    match inner.as_rule() {
                        Rule::label_only_line => {
                            // Label on its own line
                            for part in inner.into_inner() {
                                if part.as_rule() == Rule::label {
                                    let label_name = self.extract_label_name(&part);
                                    if self.symbols.contains_key(&label_name) {
                                        return Err(eyre::eyre!(
                                            "Duplicate label: {}",
                                            label_name
                                        ));
                                    }
                                    self.symbols.insert(label_name, self.current_address);
                                }
                            }
                        }
                        Rule::instruction_line => {
                            // Check for label and instruction
                            for part in inner.into_inner() {
                                match part.as_rule() {
                                    Rule::label => {
                                        let label_name = self.extract_label_name(&part);
                                        if self.symbols.contains_key(&label_name) {
                                            return Err(eyre::eyre!(
                                                "Duplicate label: {}",
                                                label_name
                                            ));
                                        }
                                        self.symbols.insert(label_name, self.current_address);
                                    }
                                    Rule::instruction => {
                                        // Each instruction takes one word
                                        self.current_address += 1;
                                    }
                                    _ => {}
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(())
    }

    /// Pass 2: Generate instructions, resolving label references
    fn pass2(&mut self, program: &str) -> eyre::Result<Vec<Instruction>> {
        let parsed = LC3BAsmParser::parse(Rule::program, program)?
            .next()
            .unwrap();

        self.current_address = 0;
        let mut instructions = Vec::new();

        for pair in parsed.into_inner() {
            if pair.as_rule() == Rule::line {
                for inner in pair.into_inner() {
                    if inner.as_rule() == Rule::instruction_line {
                        for part in inner.into_inner() {
                            if part.as_rule() == Rule::instruction {
                                let inst = self.instruction_from_pair(part)?;
                                instructions.push(inst);
                                self.current_address += 1;
                            }
                        }
                    }
                }
            }
        }

        Ok(instructions)
    }

    fn extract_label_name(&self, pair: &Pair<Rule>) -> String {
        // Label rule contains identifier followed by ":"
        for inner in pair.clone().into_inner() {
            if inner.as_rule() == Rule::identifier {
                return inner.as_str().to_string();
            }
        }
        // Fallback: strip trailing colon and whitespace
        pair.as_str().trim().trim_end_matches(':').trim().to_string()
    }

    fn resolve_label_or_offset(&self, operand: &Pair<Rule>) -> eyre::Result<i16> {
        match operand.as_rule() {
            Rule::literal => {
                let s = operand.as_str().strip_prefix('#').unwrap_or(operand.as_str());
                Ok(s.parse()?)
            }
            Rule::identifier => {
                let label_name = operand.as_str();
                let target_addr = self.symbols.get(label_name).ok_or_else(|| {
                    eyre::eyre!("Undefined label: {}", label_name)
                })?;
                // PC-relative offset: target - (current + 1)
                let offset = (*target_addr as i32) - (self.current_address as i32 + 1);
                Ok(offset as i16)
            }
            _ => Err(eyre::eyre!("Expected literal or label, got {:?}", operand.as_rule())),
        }
    }

    fn instruction_from_pair(&self, pair: Pair<Rule>) -> eyre::Result<Instruction> {
        let mut inner = pair.into_inner();
        let opcode = inner.next();
        if opcode.is_none() {
            return Err(eyre::eyre!("could not handle {:#?}", opcode));
        }
        let opcode = opcode.unwrap();
        let opcode_str = opcode.as_str();

        // Check for BR variants first
        if let Some(condition) = parse_br_condition(opcode_str) {
            let mut operands = inner.next().unwrap().into_inner();
            let offset_arg = operands.next().unwrap();
            let offset_value = self.resolve_label_or_offset(&offset_arg)?;
            
            // Check range for PCOffset9
            if offset_value < -256 || offset_value > 255 {
                return Err(eyre::eyre!(
                    "Branch offset {} out of range (-256 to 255)",
                    offset_value
                ));
            }
            
            let offset = PCOffset9::new(offset_value);
            return Ok(Instruction::Br(condition, offset));
        }

        let instruction = match opcode_str.to_uppercase().as_str() {
            "ADD" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg_one = operands.next().unwrap().as_str();
                let dst_reg = Register::from_str(arg_one)?;

                let arg_two = operands.next().unwrap().as_str();
                let src_reg = Register::from_str(arg_two)?;

                let arg_three = operands.next().unwrap();
                let inner: AddInstruction = match arg_three.as_rule() {
                    Rule::literal => {
                        let imm5 = Immediate5::from_str(arg_three.as_str())?;
                        AddInstruction::AddImm(dst_reg, src_reg, imm5)
                    }
                    Rule::register => {
                        let src2_reg = Register::from_str(arg_three.as_str())?;
                        AddInstruction::AddReg(src_reg, dst_reg, src2_reg)
                    }
                    _ => return Err(eyre::eyre!("unhandled `{:?}`", arg_three)),
                };
                Instruction::AddInstruction(inner)
            }
            "AND" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg_one = operands.next().unwrap().as_str();
                let dst_reg = Register::from_str(arg_one)?;

                let arg_two = operands.next().unwrap().as_str();
                let src_reg = Register::from_str(arg_two)?;

                let arg_three = operands.next().unwrap();
                let inner: AndInstruction = match arg_three.as_rule() {
                    Rule::literal => {
                        let imm5 = Immediate5::from_str(arg_three.as_str())?;
                        AndInstruction::AndImm(dst_reg, src_reg, imm5)
                    }
                    Rule::register => {
                        let src2_reg = Register::from_str(arg_three.as_str())?;
                        AndInstruction::AndReg(src_reg, dst_reg, src2_reg)
                    }
                    _ => return Err(eyre::eyre!("unhandled `{:?}`", arg_three)),
                };
                Instruction::AndInstruction(inner)
            }
            "NOT" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg_one = operands.next().unwrap().as_str();
                let dst_reg = Register::from_str(arg_one)?;

                let arg_two = operands.next().unwrap().as_str();
                let src_reg = Register::from_str(arg_two)?;

                Instruction::Not(dst_reg, src_reg)
            }
            other => return Err(eyre::eyre!("unhandled opcode {:#?}", other)),
        };

        Ok(instruction)
    }
}

fn parse_br_condition(opcode: &str) -> Option<Condition> {
    // Handle BR variants: BR, BRn, BRz, BRp, BRnz, BRnp, BRzp, BRnzp
    let opcode_upper = opcode.to_uppercase();
    if !opcode_upper.starts_with("BR") {
        return None;
    }

    let suffix = &opcode_upper[2..];

    // Empty suffix means BRnzp (unconditional branch)
    if suffix.is_empty() {
        return Some(Condition { n: true, z: true, p: true });
    }

    let n = suffix.contains('N');
    let z = suffix.contains('Z');
    let p = suffix.contains('P');

    // At least one condition must be set
    if !n && !z && !p {
        return None;
    }

    Some(Condition { n, z, p })
}

pub fn parse_to_program(program: &str) -> eyre::Result<Vec<Instruction>> {
    let mut assembler = Assembler::new();
    assembler.pass1(program)?;
    assembler.pass2(program)
}

#[cfg(test)]
mod test {
    use lc3b_isa::{AddInstruction, Condition, Immediate5, Instruction, PCOffset9, Register};

    #[test]
    pub fn test_add_instructions() {
        let test_asm = r#"
    ADD R1, R1, 8; this is a comment
    ADD R1, R2, 10;
"#;

        let instructions = super::parse_to_program(test_asm).unwrap();
        assert_eq!(
            instructions,
            [
                Instruction::AddInstruction(AddInstruction::AddImm(
                    Register::Register1,
                    Register::Register1,
                    Immediate5::new(8,).unwrap(),
                ),),
                Instruction::AddInstruction(AddInstruction::AddImm(
                    Register::Register1,
                    Register::Register2,
                    Immediate5::new(10,).unwrap(),
                ),),
            ]
        )
    }

    #[test]
    pub fn test_label_forward_reference() {
        let test_asm = r#"
    BRz skip
    ADD R1, R1, #1
skip:
    ADD R2, R2, #2
"#;

        let instructions = super::parse_to_program(test_asm).unwrap();
        assert_eq!(instructions.len(), 3);
        
        // BRz skip: from address 0, skip is at address 2
        // offset = 2 - (0 + 1) = 1
        assert_eq!(
            instructions[0],
            Instruction::Br(
                Condition { n: false, z: true, p: false },
                PCOffset9::new(1)
            )
        );
    }

    #[test]
    pub fn test_label_backward_reference() {
        let test_asm = r#"
loop:
    ADD R0, R0, #-1
    BRp loop
"#;

        let instructions = super::parse_to_program(test_asm).unwrap();
        assert_eq!(instructions.len(), 2);
        
        // BRp loop: from address 1, loop is at address 0
        // offset = 0 - (1 + 1) = -2
        assert_eq!(
            instructions[1],
            Instruction::Br(
                Condition { n: false, z: false, p: true },
                PCOffset9::new(-2)
            )
        );
    }

    #[test]
    pub fn test_duplicate_label_error() {
        let test_asm = r#"
label:
    ADD R0, R0, #1
label:
    ADD R1, R1, #1
"#;

        let result = super::parse_to_program(test_asm);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Duplicate label"));
    }

    #[test]
    pub fn test_undefined_label_error() {
        let test_asm = r#"
    BRz undefined_label
"#;

        let result = super::parse_to_program(test_asm);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Undefined label"));
    }
}


