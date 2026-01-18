//! Builder for constructing AST from pest parse tree

use crate::ast::*;
use lc3b_c_grammar::Rule;
use pest::iterators::{Pair, Pairs};

/// Build an AST from a pest parse tree
pub fn build_ast(pairs: Pairs<Rule>) -> Result<Program, String> {
    let mut items = Vec::new();

    for pair in pairs {
        match pair.as_rule() {
            Rule::program => {
                for inner in pair.into_inner() {
                    if let Some(item) = build_top_level_item(inner)? {
                        items.push(item);
                    }
                }
            }
            _ => {}
        }
    }

    Ok(Program { items })
}

fn build_top_level_item(pair: Pair<Rule>) -> Result<Option<TopLevelItem>, String> {
    match pair.as_rule() {
        Rule::top_level_item => {
            let inner = pair.into_inner().next().unwrap();
            build_top_level_item(inner)
        }
        Rule::function_definition => {
            let func = build_function(pair)?;
            Ok(Some(TopLevelItem::Function(func)))
        }
        Rule::global_declaration => {
            let decl = build_declaration_from_global(pair)?;
            Ok(Some(TopLevelItem::GlobalDeclaration(decl)))
        }
        Rule::EOI => Ok(None),
        _ => Err(format!("Unexpected top-level rule: {:?}", pair.as_rule())),
    }
}

fn build_function(pair: Pair<Rule>) -> Result<Function, String> {
    let mut inner = pair.into_inner();

    let return_type = build_return_type(inner.next().unwrap())?;
    let name = inner.next().unwrap().as_str().to_string();

    let mut parameters = Vec::new();
    let mut body = Block { items: Vec::new() };

    for part in inner {
        match part.as_rule() {
            Rule::parameter_list => {
                parameters = build_parameter_list(part)?;
            }
            Rule::compound_statement => {
                body = build_block(part)?;
            }
            _ => {}
        }
    }

    Ok(Function {
        return_type,
        name,
        parameters,
        body,
    })
}

fn build_return_type(pair: Pair<Rule>) -> Result<Type, String> {
    let inner = pair.into_inner().next().unwrap();
    build_type_from_rule(inner)
}

fn build_type_from_rule(pair: Pair<Rule>) -> Result<Type, String> {
    match pair.as_rule() {
        Rule::void_type => Ok(Type::Void),
        Rule::int_type => Ok(Type::Int),
        Rule::uint16_type => Ok(Type::Uint16),
        Rule::short_type => {
            let text = pair.as_str();
            let unsigned = text.contains("unsigned");
            Ok(Type::Short { unsigned })
        }
        Rule::char_type => Ok(Type::Char),
        Rule::pointer_type => {
            let inner = pair.into_inner().next().unwrap();
            let base = build_type_from_rule(inner)?;
            Ok(Type::Pointer(Box::new(base)))
        }
        Rule::type_specifier => {
            let inner = pair.into_inner().next().unwrap();
            build_type_from_rule(inner)
        }
        Rule::return_type => {
            let inner = pair.into_inner().next().unwrap();
            build_type_from_rule(inner)
        }
        _ => Err(format!("Unexpected type rule: {:?}", pair.as_rule())),
    }
}

fn build_parameter_list(pair: Pair<Rule>) -> Result<Vec<Parameter>, String> {
    let mut params = Vec::new();
    for param_pair in pair.into_inner() {
        if param_pair.as_rule() == Rule::parameter {
            let mut inner = param_pair.into_inner();
            let ty = build_type_from_rule(inner.next().unwrap())?;
            let name = inner.next().unwrap().as_str().to_string();
            params.push(Parameter { ty, name });
        }
    }
    Ok(params)
}

fn build_block(pair: Pair<Rule>) -> Result<Block, String> {
    let mut items = Vec::new();
    for inner in pair.into_inner() {
        if inner.as_rule() == Rule::block_item {
            let item = build_block_item(inner)?;
            items.push(item);
        }
    }
    Ok(Block { items })
}

fn build_block_item(pair: Pair<Rule>) -> Result<BlockItem, String> {
    let inner = pair.into_inner().next().unwrap();
    match inner.as_rule() {
        Rule::declaration => {
            let decl = build_declaration(inner)?;
            Ok(BlockItem::Declaration(decl))
        }
        Rule::statement => {
            let stmt = build_statement(inner)?;
            Ok(BlockItem::Statement(stmt))
        }
        _ => Err(format!("Unexpected block item: {:?}", inner.as_rule())),
    }
}

fn build_declaration(pair: Pair<Rule>) -> Result<Declaration, String> {
    let mut inner = pair.into_inner();
    let ty = build_type_from_rule(inner.next().unwrap())?;
    let declarators = build_init_declarator_list(inner.next().unwrap())?;
    Ok(Declaration { ty, declarators })
}

fn build_declaration_from_global(pair: Pair<Rule>) -> Result<Declaration, String> {
    let mut inner = pair.into_inner();
    let ty = build_type_from_rule(inner.next().unwrap())?;
    let declarators = build_init_declarator_list(inner.next().unwrap())?;
    Ok(Declaration { ty, declarators })
}

fn build_init_declarator_list(pair: Pair<Rule>) -> Result<Vec<Declarator>, String> {
    let mut declarators = Vec::new();
    for decl_pair in pair.into_inner() {
        if decl_pair.as_rule() == Rule::init_declarator {
            let decl = build_init_declarator(decl_pair)?;
            declarators.push(decl);
        }
    }
    Ok(declarators)
}

fn build_init_declarator(pair: Pair<Rule>) -> Result<Declarator, String> {
    let mut inner = pair.into_inner();
    let name = inner.next().unwrap().as_str().to_string();
    let initializer = if let Some(init_pair) = inner.next() {
        Some(build_initializer(init_pair)?)
    } else {
        None
    };
    Ok(Declarator { name, initializer })
}

fn build_initializer(pair: Pair<Rule>) -> Result<Initializer, String> {
    let inner = pair.into_inner().next().unwrap();
    match inner.as_rule() {
        Rule::string_literal => {
            let s = extract_string_content(&inner);
            Ok(Initializer::String(s))
        }
        _ => {
            // Check if the expression is just a string literal
            let expr = build_expression(inner)?;
            if let Expression::StringLiteral(s) = expr {
                Ok(Initializer::String(s))
            } else {
                Ok(Initializer::Expression(expr))
            }
        }
    }
}

fn build_statement(pair: Pair<Rule>) -> Result<Statement, String> {
    let inner = pair.into_inner().next().unwrap();
    match inner.as_rule() {
        Rule::compound_statement => {
            let block = build_block(inner)?;
            Ok(Statement::Compound(block))
        }
        Rule::expression_statement => {
            let expr_pair = inner.into_inner().next().unwrap();
            let expr = build_expression(expr_pair)?;
            Ok(Statement::Expression(expr))
        }
        Rule::if_statement => build_if_statement(inner),
        Rule::while_statement => build_while_statement(inner),
        Rule::for_statement => build_for_statement(inner),
        Rule::return_statement => build_return_statement(inner),
        Rule::empty_statement => Ok(Statement::Empty),
        _ => Err(format!("Unexpected statement: {:?}", inner.as_rule())),
    }
}

fn build_if_statement(pair: Pair<Rule>) -> Result<Statement, String> {
    let mut inner = pair.into_inner();
    let condition = build_expression(inner.next().unwrap())?;
    let then_branch = Box::new(build_statement(inner.next().unwrap())?);
    let else_branch = inner.next().map(|p| build_statement(p)).transpose()?.map(Box::new);

    Ok(Statement::If {
        condition,
        then_branch,
        else_branch,
    })
}

fn build_while_statement(pair: Pair<Rule>) -> Result<Statement, String> {
    let mut inner = pair.into_inner();
    let condition = build_expression(inner.next().unwrap())?;
    let body = Box::new(build_statement(inner.next().unwrap())?);

    Ok(Statement::While { condition, body })
}

fn build_for_statement(pair: Pair<Rule>) -> Result<Statement, String> {
    let mut init = None;
    let mut condition = None;
    let mut update = None;
    let mut body = None;

    for inner in pair.into_inner() {
        match inner.as_rule() {
            Rule::for_init => {
                init = Some(build_for_init(inner)?);
            }
            Rule::expression => {
                // Could be condition or update - we track by order
                if condition.is_none() {
                    condition = Some(build_expression(inner)?);
                } else {
                    update = Some(build_expression(inner)?);
                }
            }
            Rule::statement => {
                body = Some(Box::new(build_statement(inner)?));
            }
            // Handle compound_statement directly (for loop body like `{ }`)
            Rule::compound_statement => {
                let block = build_block(inner)?;
                body = Some(Box::new(Statement::Compound(block)));
            }
            _ => {}
        }
    }

    Ok(Statement::For {
        init,
        condition,
        update,
        body: body.ok_or_else(|| "For loop missing body".to_string())?,
    })
}

fn build_for_init(pair: Pair<Rule>) -> Result<ForInit, String> {
    let inner = pair.into_inner().next().unwrap();
    match inner.as_rule() {
        Rule::declaration_no_semi => {
            let mut parts = inner.into_inner();
            let ty = build_type_from_rule(parts.next().unwrap())?;
            let declarators = build_init_declarator_list(parts.next().unwrap())?;
            Ok(ForInit::Declaration(Declaration { ty, declarators }))
        }
        _ => {
            let expr = build_expression(inner)?;
            Ok(ForInit::Expression(expr))
        }
    }
}

fn build_return_statement(pair: Pair<Rule>) -> Result<Statement, String> {
    let expr = pair.into_inner().next().map(|p| build_expression(p)).transpose()?;
    Ok(Statement::Return(expr))
}

fn build_expression(pair: Pair<Rule>) -> Result<Expression, String> {
    match pair.as_rule() {
        Rule::expression | Rule::assignment_expression | Rule::conditional_expression => {
            // Check if this is an assignment
            let mut inner = pair.clone().into_inner().peekable();
            
            // Look for assignment pattern: identifier, assignment_operator, expression
            let first = inner.next();
            if first.is_none() {
                return Err("Empty expression".to_string());
            }
            let first = first.unwrap();
            
            if first.as_rule() == Rule::identifier {
                if let Some(second) = inner.next() {
                    if second.as_rule() == Rule::assignment_operator {
                        let op = match second.as_str() {
                            "=" => AssignOp::Assign,
                            "+=" => AssignOp::AddAssign,
                            "-=" => AssignOp::SubAssign,
                            "&=" => AssignOp::AndAssign,
                            "|=" => AssignOp::OrAssign,
                            "^=" => AssignOp::XorAssign,
                            _ => return Err(format!("Unknown assign op: {}", second.as_str())),
                        };
                        let value = build_expression(inner.next().unwrap())?;
                        return Ok(Expression::Assignment {
                            op,
                            target: first.as_str().to_string(),
                            value: Box::new(value),
                        });
                    }
                }
            }
            
            // Not an assignment, recurse into first child
            build_expression(pair.into_inner().next().unwrap())
        }
        Rule::logical_or_expression => build_binary_expression(pair, &[("||", BinaryOp::LogicalOr)]),
        Rule::logical_and_expression => build_binary_expression(pair, &[("&&", BinaryOp::LogicalAnd)]),
        Rule::bitwise_or_expression => build_binary_expression(pair, &[("|", BinaryOp::BitOr)]),
        Rule::bitwise_xor_expression => build_binary_expression(pair, &[("^", BinaryOp::BitXor)]),
        Rule::bitwise_and_expression => build_binary_expression(pair, &[("&", BinaryOp::BitAnd)]),
        Rule::equality_expression => {
            build_binary_expression(pair, &[("==", BinaryOp::Equal), ("!=", BinaryOp::NotEqual)])
        }
        Rule::relational_expression => {
            build_binary_expression(pair, &[
                ("<=", BinaryOp::LessEqual),
                (">=", BinaryOp::GreaterEqual),
                ("<", BinaryOp::Less),
                (">", BinaryOp::Greater),
            ])
        }
        Rule::shift_expression => {
            build_binary_expression(pair, &[("<<", BinaryOp::ShiftLeft), (">>", BinaryOp::ShiftRight)])
        }
        Rule::additive_expression => {
            build_binary_expression(pair, &[("+", BinaryOp::Add), ("-", BinaryOp::Sub)])
        }
        Rule::multiplicative_expression => {
            build_binary_expression(pair, &[("*", BinaryOp::Mul), ("/", BinaryOp::Div), ("%", BinaryOp::Mod)])
        }
        Rule::unary_expression => build_unary_expression(pair),
        Rule::postfix_expression => build_postfix_expression(pair),
        Rule::primary_expression => build_primary_expression(pair),
        Rule::integer_literal => {
            let value = parse_integer_literal(pair.as_str())?;
            Ok(Expression::IntLiteral(value))
        }
        Rule::identifier => Ok(Expression::Identifier(pair.as_str().to_string())),
        Rule::char_literal => {
            let ch = extract_char_content(&pair);
            Ok(Expression::CharLiteral(ch))
        }
        Rule::string_literal => {
            let s = extract_string_content(&pair);
            Ok(Expression::StringLiteral(s))
        }
        _ => Err(format!("Unexpected expression rule: {:?}", pair.as_rule())),
    }
}

fn build_binary_expression(pair: Pair<Rule>, ops: &[(&str, BinaryOp)]) -> Result<Expression, String> {
    let mut inner = pair.into_inner();
    let mut left = build_expression(inner.next().unwrap())?;

    while let Some(op_or_expr) = inner.next() {
        // Check if this is an operator
        let op_str = op_or_expr.as_str();
        let mut found_op = None;
        for (pattern, op) in ops {
            if op_str == *pattern {
                found_op = Some(*op);
                break;
            }
        }

        if let Some(op) = found_op {
            let right = build_expression(inner.next().unwrap())?;
            left = Expression::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
            };
        } else {
            // Not an operator, must be next operand in chain
            let right = build_expression(op_or_expr)?;
            // Use first operator as default (shouldn't happen in well-formed input)
            left = Expression::Binary {
                op: ops[0].1,
                left: Box::new(left),
                right: Box::new(right),
            };
        }
    }

    Ok(left)
}

fn build_unary_expression(pair: Pair<Rule>) -> Result<Expression, String> {
    let mut inner = pair.into_inner();
    let first = inner.next().unwrap();

    match first.as_rule() {
        Rule::unary_operator => {
            let op = match first.as_str() {
                "-" => UnaryOp::Negate,
                "~" => UnaryOp::BitNot,
                "!" => UnaryOp::LogicalNot,
                "*" => UnaryOp::Deref,
                "&" => UnaryOp::AddressOf,
                "++" => {
                    // Pre-increment
                    let operand = inner.next().unwrap();
                    if let Ok(Expression::Identifier(name)) = build_expression(operand) {
                        return Ok(Expression::PreIncrement(name));
                    }
                    return Err("Pre-increment requires identifier".to_string());
                }
                "--" => {
                    // Pre-decrement
                    let operand = inner.next().unwrap();
                    if let Ok(Expression::Identifier(name)) = build_expression(operand) {
                        return Ok(Expression::PreDecrement(name));
                    }
                    return Err("Pre-decrement requires identifier".to_string());
                }
                "+" => {
                    // Unary plus is a no-op
                    return build_expression(inner.next().unwrap());
                }
                _ => return Err(format!("Unknown unary operator: {}", first.as_str())),
            };
            let operand = build_expression(inner.next().unwrap())?;
            Ok(Expression::Unary {
                op,
                operand: Box::new(operand),
            })
        }
        _ => build_expression(first),
    }
}

fn build_postfix_expression(pair: Pair<Rule>) -> Result<Expression, String> {
    let mut inner = pair.into_inner();
    let primary = build_expression(inner.next().unwrap())?;

    let mut result = primary;
    for suffix in inner {
        match suffix.as_rule() {
            Rule::postfix_suffix => {
                // postfix_suffix can be function_call_args, array_subscript, or literal ++ / --
                let suffix_str = suffix.as_str();
                if suffix_str == "++" {
                    if let Expression::Identifier(name) = result {
                        result = Expression::PostIncrement(name);
                    } else {
                        return Err("Post-increment requires identifier".to_string());
                    }
                } else if suffix_str == "--" {
                    if let Expression::Identifier(name) = result {
                        result = Expression::PostDecrement(name);
                    } else {
                        return Err("Post-decrement requires identifier".to_string());
                    }
                } else if let Some(suffix_inner) = suffix.into_inner().next() {
                    match suffix_inner.as_rule() {
                        Rule::function_call_args => {
                            if let Expression::Identifier(name) = result {
                                let args = build_argument_list(suffix_inner)?;
                                result = Expression::Call {
                                    function: name,
                                    arguments: args,
                                };
                            } else {
                                return Err("Function call on non-identifier".to_string());
                            }
                        }
                        Rule::array_subscript => {
                            let index = suffix_inner.into_inner().next().unwrap();
                            let index_expr = build_expression(index)?;
                            result = Expression::Subscript {
                                array: Box::new(result),
                                index: Box::new(index_expr),
                            };
                        }
                        _ => {
                            return Err(format!("Unexpected postfix suffix: {:?}", suffix_inner.as_rule()));
                        }
                    }
                }
            }
            _ => {
                return Err(format!("Unexpected in postfix expression: {:?}", suffix.as_rule()));
            }
        }
    }

    Ok(result)
}

fn build_primary_expression(pair: Pair<Rule>) -> Result<Expression, String> {
    let inner = pair.into_inner().next().unwrap();
    match inner.as_rule() {
        Rule::expression => build_expression(inner),
        Rule::integer_literal => {
            let value = parse_integer_literal(inner.as_str())?;
            Ok(Expression::IntLiteral(value))
        }
        Rule::char_literal => {
            let ch = extract_char_content(&inner);
            Ok(Expression::CharLiteral(ch))
        }
        Rule::string_literal => {
            let s = extract_string_content(&inner);
            Ok(Expression::StringLiteral(s))
        }
        Rule::identifier => Ok(Expression::Identifier(inner.as_str().to_string())),
        _ => Err(format!("Unexpected primary: {:?}", inner.as_rule())),
    }
}

fn build_argument_list(pair: Pair<Rule>) -> Result<Vec<Expression>, String> {
    let mut args = Vec::new();
    for inner in pair.into_inner() {
        if inner.as_rule() == Rule::argument_list {
            for arg in inner.into_inner() {
                args.push(build_expression(arg)?);
            }
        }
    }
    Ok(args)
}

fn parse_integer_literal(s: &str) -> Result<i32, String> {
    if s.starts_with("0x") || s.starts_with("0X") {
        i32::from_str_radix(&s[2..], 16).map_err(|e| e.to_string())
    } else {
        s.parse().map_err(|e: std::num::ParseIntError| e.to_string())
    }
}

fn extract_string_content(pair: &Pair<Rule>) -> String {
    let mut result = String::new();
    for inner in pair.clone().into_inner() {
        if inner.as_rule() == Rule::string_content {
            result = process_escape_sequences(inner.as_str());
        }
    }
    result
}

fn extract_char_content(pair: &Pair<Rule>) -> char {
    for inner in pair.clone().into_inner() {
        if inner.as_rule() == Rule::char_content {
            let s = process_escape_sequences(inner.as_str());
            return s.chars().next().unwrap_or('\0');
        }
    }
    '\0'
}

fn process_escape_sequences(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\\' {
            if let Some(&next) = chars.peek() {
                chars.next();
                match next {
                    'n' => result.push('\n'),
                    'r' => result.push('\r'),
                    't' => result.push('\t'),
                    '\\' => result.push('\\'),
                    '\'' => result.push('\''),
                    '"' => result.push('"'),
                    '0' => result.push('\0'),
                    'x' => {
                        // Hex escape \xNN
                        let mut hex = String::new();
                        for _ in 0..2 {
                            if let Some(&h) = chars.peek() {
                                if h.is_ascii_hexdigit() {
                                    hex.push(h);
                                    chars.next();
                                }
                            }
                        }
                        if let Ok(code) = u8::from_str_radix(&hex, 16) {
                            result.push(code as char);
                        }
                    }
                    _ => {
                        result.push('\\');
                        result.push(next);
                    }
                }
            }
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use lc3b_c_grammar::parse;

    fn parse_and_build(source: &str) -> Result<Program, String> {
        let pairs = parse(source).map_err(|e| e.to_string())?;
        build_ast(pairs)
    }

    #[test]
    fn test_empty_main() {
        let ast = parse_and_build("int main() {}").unwrap();
        assert_eq!(ast.items.len(), 1);
        if let TopLevelItem::Function(f) = &ast.items[0] {
            assert_eq!(f.name, "main");
            assert_eq!(f.return_type, Type::Int);
            assert!(f.parameters.is_empty());
        } else {
            panic!("Expected function");
        }
    }

    #[test]
    fn test_void_function() {
        let ast = parse_and_build("void myFunc() {}").unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            assert_eq!(f.name, "myFunc");
            assert_eq!(f.return_type, Type::Void);
        } else {
            panic!("Expected function");
        }
    }

    #[test]
    fn test_function_with_params() {
        let ast = parse_and_build("int add(int a, int b) { return a; }").unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            assert_eq!(f.parameters.len(), 2);
            assert_eq!(f.parameters[0].name, "a");
            assert_eq!(f.parameters[1].name, "b");
        } else {
            panic!("Expected function");
        }
    }

    #[test]
    fn test_variable_declaration() {
        let ast = parse_and_build("int main() { int x = 42; }").unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            assert_eq!(f.body.items.len(), 1);
            if let BlockItem::Declaration(d) = &f.body.items[0] {
                assert_eq!(d.declarators[0].name, "x");
            } else {
                panic!("Expected declaration");
            }
        } else {
            panic!("Expected function");
        }
    }

    #[test]
    fn test_addition() {
        let ast = parse_and_build("int main() { int x = 1 + 2; }").unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            if let BlockItem::Declaration(d) = &f.body.items[0] {
                if let Some(Initializer::Expression(Expression::Binary { op, .. })) =
                    &d.declarators[0].initializer
                {
                    assert_eq!(*op, BinaryOp::Add);
                } else {
                    panic!("Expected binary add expression");
                }
            }
        }
    }

    #[test]
    fn test_for_loop() {
        let ast = parse_and_build(
            "int main() { for (int i = 0; i < 10; i++) { } }",
        )
        .unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            if let BlockItem::Statement(Statement::For { init, condition, update, .. }) =
                &f.body.items[0]
            {
                assert!(init.is_some());
                assert!(condition.is_some());
                assert!(update.is_some());
            } else {
                panic!("Expected for loop");
            }
        }
    }

    #[test]
    fn test_string_literal() {
        let ast = parse_and_build(r#"int main() { char* s = "hello"; }"#).unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            if let BlockItem::Declaration(d) = &f.body.items[0] {
                if let Some(Initializer::String(s)) = &d.declarators[0].initializer {
                    assert_eq!(s, "hello");
                } else {
                    panic!("Expected string initializer");
                }
            }
        }
    }

    #[test]
    fn test_uint16_type() {
        let ast = parse_and_build("int main() { uint16_t x = 0x1234; }").unwrap();
        if let TopLevelItem::Function(f) = &ast.items[0] {
            if let BlockItem::Declaration(d) = &f.body.items[0] {
                assert_eq!(d.ty, Type::Uint16);
            }
        }
    }
}
