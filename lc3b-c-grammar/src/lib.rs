#![forbid(unsafe_code)]

use pest::{iterators::Pairs, Parser};

#[derive(pest_derive::Parser)]
#[grammar = "c_grammar.pest"]
pub struct CParser;

pub type Error = pest::error::Error<Rule>;

/// Parse a C source string and return the parse tree
pub fn parse(source: &str) -> Result<Pairs<'_, Rule>, Box<Error>> {
    CParser::parse(Rule::program, source).map_err(Box::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_main() {
        let source = "int main() {}";
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_void_function() {
        let source = "void myFunction() {}";
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_main_with_return() {
        let source = r#"
            int main() {
                return 0;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_addition_expression() {
        let source = r#"
            int main() {
                int a = 1 + 2;
                return a;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_subtraction_expression() {
        let source = r#"
            int main() {
                int x = 10 - 5;
                return x;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_complex_arithmetic() {
        let source = r#"
            int main() {
                int a = 1;
                int b = 2;
                int c = a + b - 3;
                return c;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_for_loop() {
        let source = r#"
            int main() {
                int sum = 0;
                for (int i = 0; i < 10; i++) {
                    sum = sum + i;
                }
                return sum;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_for_loop_with_existing_var() {
        let source = r#"
            int main() {
                int i;
                int sum = 0;
                for (i = 0; i < 10; i++) {
                    sum += i;
                }
                return sum;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_uint16_t_type() {
        let source = r#"
            int main() {
                uint16_t value = 0x1234;
                return value;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_short_type() {
        let source = r#"
            int main() {
                short value = 100;
                unsigned short uvalue = 200;
                return value;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_string_literal() {
        let source = r#"
            int main() {
                char* msg = "Hello, LC-3B!";
                return 0;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_string_with_escapes() {
        let source = r#"
            int main() {
                char* msg = "Hello\nWorld\t!";
                return 0;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_function_with_parameters() {
        let source = r#"
            int add(int a, int b) {
                return a + b;
            }
            
            int main() {
                int result = add(3, 4);
                return result;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_void_subroutine() {
        let source = r#"
            void mySubroutine() {
                int x = 42;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_if_statement() {
        let source = r#"
            int main() {
                int x = 5;
                if (x > 0) {
                    return 1;
                }
                return 0;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_if_else() {
        let source = r#"
            int main() {
                int x = 5;
                if (x > 10) {
                    return 1;
                } else {
                    return 0;
                }
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_while_loop() {
        let source = r#"
            int main() {
                int i = 0;
                while (i < 10) {
                    i++;
                }
                return i;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_comments() {
        let source = r#"
            // This is a line comment
            int main() {
                /* This is a 
                   block comment */
                int x = 42; // inline comment
                return x;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_bitwise_operations() {
        let source = r#"
            int main() {
                int a = 0xFF;
                int b = a & 0x0F;
                int c = b | 0x10;
                int d = c ^ 0x05;
                int e = ~d;
                return e;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_shift_operations() {
        let source = r#"
            int main() {
                int a = 1 << 4;
                int b = 16 >> 2;
                return a + b;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_multiple_functions() {
        let source = r#"
            void setup() {
                int x = 0;
            }

            void loop() {
                int i;
                for (i = 0; i < 100; i++) {
                    // do something
                }
            }

            int main() {
                setup();
                loop();
                return 0;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_char_literal() {
        let source = r#"
            int main() {
                char c = 'A';
                char newline = '\n';
                return c;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn test_global_variable() {
        let source = r#"
            int global_counter = 0;
            
            void increment() {
                global_counter = global_counter + 1;
            }
            
            int main() {
                increment();
                return global_counter;
            }
        "#;
        let result = parse(source);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }
}
