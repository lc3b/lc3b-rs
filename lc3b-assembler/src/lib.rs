#![forbid(unsafe_code)]

use std::{collections::HashMap, str::FromStr};

use lc3b_isa::{AddInstruction, AndInstruction, Condition, Immediate5, Instruction, PCOffset9, PCOffset11, Register, TrapVect8};
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

/// Result of assembling a program
#[derive(Debug, Clone, PartialEq)]
pub struct AssembledProgram {
    /// Starting address specified by .ORIG (defaults to 0x3000)
    pub origin: u16,
    /// Raw 16-bit words (instructions and data)
    pub words: Vec<u16>,
}

/// Two-pass assembler that supports labels and directives
struct Assembler {
    symbols: HashMap<String, u16>,
    origin: u16,
    current_address: u16,
}

impl Assembler {
    fn new() -> Self {
        Assembler {
            symbols: HashMap::new(),
            origin: 0x3000, // Default origin
            current_address: 0x3000,
        }
    }

    /// Pass 1: Build symbol table by collecting all label addresses and processing directives
    fn pass1(&mut self, program: &str) -> eyre::Result<()> {
        let parsed = LC3BAsmParser::parse(Rule::program, program)?
            .next()
            .unwrap();

        for pair in parsed.into_inner() {
            if pair.as_rule() == Rule::line {
                for inner in pair.into_inner() {
                    match inner.as_rule() {
                        Rule::directive_line => {
                            self.pass1_directive_line(inner)?;
                        }
                        Rule::label_only_line => {
                            for part in inner.into_inner() {
                                if part.as_rule() == Rule::label {
                                    self.add_label(&part)?;
                                }
                            }
                        }
                        Rule::instruction_line => {
                            for part in inner.into_inner() {
                                match part.as_rule() {
                                    Rule::label => {
                                        self.add_label(&part)?;
                                    }
                                    Rule::instruction => {
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

    fn pass1_directive_line(&mut self, pair: Pair<Rule>) -> eyre::Result<()> {
        for part in pair.into_inner() {
            match part.as_rule() {
                Rule::label => {
                    self.add_label(&part)?;
                }
                Rule::directive => {
                    for directive in part.into_inner() {
                        match directive.as_rule() {
                            Rule::orig_directive => {
                                let hex = directive.into_inner().next().unwrap();
                                let addr = self.parse_hex_literal(&hex)?;
                                self.origin = addr;
                                self.current_address = addr;
                            }
                            Rule::end_directive => {
                                // Stop processing
                                return Ok(());
                            }
                            Rule::fill_directive => {
                                self.current_address += 1;
                            }
                            Rule::blkw_directive => {
                                let count = self.parse_directive_number(&directive)?;
                                self.current_address += count;
                            }
                            Rule::stringz_directive => {
                                let string_content = self.extract_string_content(&directive)?;
                                // +1 for null terminator
                                self.current_address += string_content.len() as u16 + 1;
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }

    /// Pass 2: Generate words, resolving label references
    fn pass2(&mut self, program: &str) -> eyre::Result<Vec<u16>> {
        let parsed = LC3BAsmParser::parse(Rule::program, program)?
            .next()
            .unwrap();

        self.current_address = self.origin;
        let mut words = Vec::new();

        for pair in parsed.into_inner() {
            if pair.as_rule() == Rule::line {
                for inner in pair.into_inner() {
                    match inner.as_rule() {
                        Rule::directive_line => {
                            let directive_words = self.pass2_directive_line(inner)?;
                            if directive_words.is_none() {
                                // .END directive - stop processing
                                return Ok(words);
                            }
                            words.extend(directive_words.unwrap());
                        }
                        Rule::instruction_line => {
                            for part in inner.into_inner() {
                                if part.as_rule() == Rule::instruction {
                                    let inst = self.instruction_from_pair(part)?;
                                    let word: u16 = (&inst).into();
                                    words.push(word);
                                    self.current_address += 1;
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(words)
    }

    fn pass2_directive_line(&mut self, pair: Pair<Rule>) -> eyre::Result<Option<Vec<u16>>> {
        let mut words = Vec::new();

        for part in pair.into_inner() {
            if part.as_rule() == Rule::directive {
                for directive in part.into_inner() {
                    match directive.as_rule() {
                        Rule::orig_directive => {
                            // Already handled in pass1, just update current_address
                            let hex = directive.into_inner().next().unwrap();
                            let addr = self.parse_hex_literal(&hex)?;
                            self.current_address = addr;
                        }
                        Rule::end_directive => {
                            return Ok(None);
                        }
                        Rule::fill_directive => {
                            let value = self.parse_fill_value(&directive)?;
                            words.push(value);
                            self.current_address += 1;
                        }
                        Rule::blkw_directive => {
                            let count = self.parse_directive_number(&directive)?;
                            for _ in 0..count {
                                words.push(0);
                            }
                            self.current_address += count;
                        }
                        Rule::stringz_directive => {
                            let string_content = self.extract_string_content(&directive)?;
                            for ch in string_content.chars() {
                                words.push(ch as u16);
                            }
                            words.push(0); // Null terminator
                            self.current_address += string_content.len() as u16 + 1;
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(Some(words))
    }

    fn add_label(&mut self, pair: &Pair<Rule>) -> eyre::Result<()> {
        let label_name = self.extract_label_name(pair);
        if self.symbols.contains_key(&label_name) {
            return Err(eyre::eyre!("Duplicate label: {}", label_name));
        }
        self.symbols.insert(label_name, self.current_address);
        Ok(())
    }

    fn extract_label_name(&self, pair: &Pair<Rule>) -> String {
        for inner in pair.clone().into_inner() {
            if inner.as_rule() == Rule::identifier {
                return inner.as_str().to_string();
            }
        }
        pair.as_str().trim().trim_end_matches(':').trim().to_string()
    }

    fn parse_hex_literal(&self, pair: &Pair<Rule>) -> eyre::Result<u16> {
        let s = pair.as_str();
        let hex_str = s.strip_prefix('x').or_else(|| s.strip_prefix('X')).unwrap_or(s);
        u16::from_str_radix(hex_str, 16).map_err(|e| eyre::eyre!("Invalid hex literal '{}': {}", s, e))
    }

    fn parse_directive_number(&self, directive: &Pair<Rule>) -> eyre::Result<u16> {
        for inner in directive.clone().into_inner() {
            match inner.as_rule() {
                Rule::hex_literal => {
                    return self.parse_hex_literal(&inner);
                }
                Rule::literal => {
                    let s = inner.as_str().strip_prefix('#').unwrap_or(inner.as_str());
                    return s.parse::<u16>().map_err(|e| eyre::eyre!("Invalid number '{}': {}", s, e));
                }
                _ => {}
            }
        }
        Err(eyre::eyre!("No number found in directive"))
    }

    fn parse_fill_value(&self, directive: &Pair<Rule>) -> eyre::Result<u16> {
        for inner in directive.clone().into_inner() {
            match inner.as_rule() {
                Rule::hex_literal => {
                    return self.parse_hex_literal(&inner);
                }
                Rule::literal => {
                    let s = inner.as_str().strip_prefix('#').unwrap_or(inner.as_str());
                    // Handle negative numbers
                    let value: i16 = s.parse().map_err(|e| eyre::eyre!("Invalid number '{}': {}", s, e))?;
                    return Ok(value as u16);
                }
                Rule::identifier => {
                    // Label reference
                    let label_name = inner.as_str();
                    let addr = self.symbols.get(label_name).ok_or_else(|| {
                        eyre::eyre!("Undefined label: {}", label_name)
                    })?;
                    return Ok(*addr);
                }
                _ => {}
            }
        }
        Err(eyre::eyre!("No value found in .FILL directive"))
    }

    fn extract_string_content(&self, directive: &Pair<Rule>) -> eyre::Result<String> {
        for inner in directive.clone().into_inner() {
            if inner.as_rule() == Rule::string_literal {
                for content in inner.into_inner() {
                    if content.as_rule() == Rule::string_content {
                        return Ok(content.as_str().to_string());
                    }
                }
            }
        }
        Err(eyre::eyre!("No string content found in .STRINGZ directive"))
    }

    fn resolve_label_or_offset(&self, operand: &Pair<Rule>) -> eyre::Result<i16> {
        match operand.as_rule() {
            Rule::literal => {
                let s = operand.as_str().strip_prefix('#').unwrap_or(operand.as_str());
                Ok(s.parse()?)
            }
            Rule::hex_literal => {
                let value = self.parse_hex_literal(operand)?;
                Ok(value as i16)
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
                    Rule::literal | Rule::hex_literal => {
                        let imm5 = Immediate5::from_str(arg_three.as_str())?;
                        AddInstruction::AddImm(dst_reg, src_reg, imm5)
                    }
                    Rule::register => {
                        let src2_reg = Register::from_str(arg_three.as_str())?;
                        AddInstruction::AddReg(dst_reg, src_reg, src2_reg)
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
                    Rule::literal | Rule::hex_literal => {
                        let imm5 = Immediate5::from_str(arg_three.as_str())?;
                        AndInstruction::AndImm(dst_reg, src_reg, imm5)
                    }
                    Rule::register => {
                        let src2_reg = Register::from_str(arg_three.as_str())?;
                        AndInstruction::AndReg(dst_reg, src_reg, src2_reg)
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
            "JSR" => {
                let mut operands = inner.next().unwrap().into_inner();
                let offset_arg = operands.next().unwrap();
                let offset_value = self.resolve_label_or_offset(&offset_arg)?;
                
                // JSR uses PCOffset11, and the offset is left-shifted by 1 in hardware
                // So we need to divide by 2 to get the actual offset stored
                // Range check: -1024 to 1023 (11-bit signed)
                if offset_value < -1024 || offset_value > 1023 {
                    return Err(eyre::eyre!(
                        "JSR offset {} out of range (-1024 to 1023)",
                        offset_value
                    ));
                }
                
                let offset = PCOffset11::new(offset_value);
                Instruction::Jsr(offset)
            }
            "JSRR" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg_one = operands.next().unwrap().as_str();
                let base_reg = Register::from_str(arg_one)?;

                Instruction::Jsrr(base_reg)
            }
            "TRAP" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg = operands.next().unwrap();
                let vector = match arg.as_rule() {
                    Rule::hex_literal => {
                        let value = self.parse_hex_literal(&arg)?;
                        if value > 0xFF {
                            return Err(eyre::eyre!("TRAP vector {} out of range (0x00-0xFF)", value));
                        }
                        value as u8
                    }
                    Rule::literal => {
                        let s = arg.as_str().strip_prefix('#').unwrap_or(arg.as_str());
                        let value: u16 = s.parse().map_err(|e| eyre::eyre!("Invalid number '{}': {}", s, e))?;
                        if value > 0xFF {
                            return Err(eyre::eyre!("TRAP vector {} out of range (0x00-0xFF)", value));
                        }
                        value as u8
                    }
                    _ => return Err(eyre::eyre!("Expected trap vector, got {:?}", arg.as_rule())),
                };
                Instruction::Trap(TrapVect8::new(vector))
            }
            "LEA" => {
                let mut operands = inner.next().unwrap().into_inner();
                let arg_one = operands.next().unwrap().as_str();
                let dst_reg = Register::from_str(arg_one)?;

                let offset_arg = operands.next().unwrap();
                let offset_value = self.resolve_label_or_offset(&offset_arg)?;

                // LEA uses LSHF(SEXT(offset), 1) in hardware, so we divide by 2
                // to get the stored offset value
                if offset_value % 2 != 0 {
                    return Err(eyre::eyre!(
                        "LEA target must be word-aligned (offset {} is not even)",
                        offset_value
                    ));
                }
                let stored_offset = offset_value / 2;

                // Check range for PCOffset9
                if stored_offset < -256 || stored_offset > 255 {
                    return Err(eyre::eyre!(
                        "LEA offset {} out of range (-256 to 255)",
                        stored_offset
                    ));
                }

                let offset = PCOffset9::new(stored_offset);
                Instruction::Lea(dst_reg, offset)
            }
            // Trap aliases
            "GETC" => Instruction::Trap(TrapVect8::new(0x20)),
            "OUT" => Instruction::Trap(TrapVect8::new(0x21)),
            "PUTS" => Instruction::Trap(TrapVect8::new(0x22)),
            "IN" => Instruction::Trap(TrapVect8::new(0x23)),
            "PUTSP" => Instruction::Trap(TrapVect8::new(0x24)),
            "HALT" => Instruction::Trap(TrapVect8::new(0x25)),
            other => return Err(eyre::eyre!("unhandled opcode {:#?}", other)),
        };

        Ok(instruction)
    }
}

fn parse_br_condition(opcode: &str) -> Option<Condition> {
    let opcode_upper = opcode.to_uppercase();
    if !opcode_upper.starts_with("BR") {
        return None;
    }

    let suffix = &opcode_upper[2..];

    if suffix.is_empty() {
        return Some(Condition { n: true, z: true, p: true });
    }

    let n = suffix.contains('N');
    let z = suffix.contains('Z');
    let p = suffix.contains('P');

    if !n && !z && !p {
        return None;
    }

    Some(Condition { n, z, p })
}

/// Assemble a program and return the origin address and raw words
pub fn assemble(program: &str) -> eyre::Result<AssembledProgram> {
    let mut assembler = Assembler::new();
    assembler.pass1(program)?;
    let words = assembler.pass2(program)?;
    Ok(AssembledProgram {
        origin: assembler.origin,
        words,
    })
}

/// Parse a program to instructions (legacy API, does not support directives)
pub fn parse_to_program(program: &str) -> eyre::Result<Vec<Instruction>> {
    let assembled = assemble(program)?;
    // Convert words back to instructions
    assembled.words
        .iter()
        .map(|&word| Instruction::try_from(word).map_err(|e| eyre::eyre!("Decode error: {:?}", e)))
        .collect()
}

#[cfg(test)]
mod test {
    use super::*;
    use lc3b_isa::{AddInstruction, Condition, Immediate5, Instruction, PCOffset9, Register};

    #[test]
    pub fn test_add_instructions() {
        let test_asm = r#"
    ADD R1, R1, 8; this is a comment
    ADD R1, R2, 10;
"#;

        let instructions = parse_to_program(test_asm).unwrap();
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

        let instructions = parse_to_program(test_asm).unwrap();
        assert_eq!(instructions.len(), 3);
        
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

        let instructions = parse_to_program(test_asm).unwrap();
        assert_eq!(instructions.len(), 2);
        
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

        let result = parse_to_program(test_asm);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Duplicate label"));
    }

    #[test]
    pub fn test_undefined_label_error() {
        let test_asm = r#"
    BRz undefined_label
"#;

        let result = parse_to_program(test_asm);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Undefined label"));
    }

}
