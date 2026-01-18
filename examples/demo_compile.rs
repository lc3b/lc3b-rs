use lc3b_c_compiler::{compile, CompileOptions};

fn main() {
    let source = r#"
int main() {
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum = sum + i;
    }
    return sum;
}
"#;
    
    let result = compile(source, &CompileOptions::default()).unwrap();
    println!("{}", result);
}
