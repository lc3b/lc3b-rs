//! Code generation: AST to LC-3B assembly text

use crate::headers::get_header;
use lc3b_c_ast::*;
use std::collections::HashMap;

/// Compilation options
#[derive(Debug, Clone)]
pub struct CompileOptions {
    /// Origin address for the program (default: 0x3000)
    pub origin: u16,
    /// Include comments showing original C code
    pub emit_comments: bool,
}

impl Default for CompileOptions {
    fn default() -> Self {
        Self {
            origin: 0x3000,
            emit_comments: true,
        }
    }
}

/// Compilation error
#[derive(Debug, Clone)]
pub struct CompileError {
    pub message: String,
}

impl std::fmt::Display for CompileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CompileError {}

/// Compile C source to LC-3B assembly text
pub fn compile(source: &str, options: &CompileOptions) -> Result<String, CompileError> {
    // First pass: parse the source to find includes
    let pairs = lc3b_c_grammar::parse(source)
        .map_err(|e| CompileError { message: e.to_string() })?;
    
    let ast = lc3b_c_ast::build_ast(pairs)
        .map_err(|e| CompileError { message: e })?;
    
    // Expand includes by parsing header contents and merging
    let expanded_ast = expand_includes(&ast)?;
    
    let mut compiler = Compiler::new(options.clone());
    compiler.compile_program(&expanded_ast)?;
    
    Ok(compiler.output)
}

/// Expand #include directives by parsing and merging header contents
fn expand_includes(program: &Program) -> Result<Program, CompileError> {
    let mut expanded_items = Vec::new();
    
    for item in &program.items {
        match item {
            TopLevelItem::Include(path) => {
                // Look up the header
                let header_source = get_header(path).ok_or_else(|| CompileError {
                    message: format!("Unknown header file: <{}>", path),
                })?;
                
                // Parse the header
                let pairs = lc3b_c_grammar::parse(header_source)
                    .map_err(|e| CompileError { 
                        message: format!("Error parsing <{}>: {}", path, e) 
                    })?;
                
                let header_ast = lc3b_c_ast::build_ast(pairs)
                    .map_err(|e| CompileError { 
                        message: format!("Error in <{}>: {}", path, e) 
                    })?;
                
                // Add all items from the header (except nested includes for now)
                for header_item in header_ast.items {
                    if !matches!(header_item, TopLevelItem::Include(_)) {
                        expanded_items.push(header_item);
                    }
                }
            }
            other => {
                expanded_items.push(other.clone());
            }
        }
    }
    
    Ok(Program { items: expanded_items })
}

/// Where a variable is stored
#[derive(Debug, Clone, Copy)]
enum VarLocation {
    /// Stored in a register (R1-R4)
    Register(u8),
    /// Stored on stack at offset from frame pointer (R5)
    Stack(i16),
}

/// Information about an inlinable function
#[derive(Debug, Clone)]
struct InlineableFunction {
    /// The trap vector to emit (for simple trap wrappers)
    trap_vector: u8,
}

/// Compiler state
struct Compiler {
    options: CompileOptions,
    output: String,
    /// Current label counter for generating unique labels
    label_counter: u32,
    /// Variable storage: maps variable name to location (register or stack)
    locals: HashMap<String, VarLocation>,
    /// Current stack offset for next local variable (when using stack allocation)
    local_offset: i16,
    /// Next available register for allocation (R1-R4)
    next_reg: u8,
    /// Whether current function uses register allocation
    use_registers: bool,
    /// Global variables and string literals
    data_section: Vec<DataItem>,
    /// Current function name (for generating labels)
    current_function: String,
    /// Set of defined function names
    defined_functions: std::collections::HashSet<String>,
    /// Set of defined global variable names
    defined_globals: std::collections::HashSet<String>,
    /// Set of globals initialized with string literals (these point directly to the string, not a pointer)
    string_globals: std::collections::HashSet<String>,
    /// Count of words emitted (for alignment)
    word_count: usize,
    /// Functions that can be inlined (maps name to inline info)
    inlineable_functions: HashMap<String, InlineableFunction>,
}

enum DataItem {
    String { label: String, value: String },
    Word { label: String, value: i32 },
}

/// Analyze a function to determine if it's "simple" enough for register allocation
fn is_simple_function(func: &Function) -> bool {
    let mut local_count = 0;
    let mut has_calls = false;
    
    count_locals_and_calls(&func.body, &mut local_count, &mut has_calls);
    
    // Simple if: at most 4 locals AND no function calls (except trap)
    local_count <= 4 && !has_calls
}

/// Check if a function is just a single trap() call and return the trap vector if so
fn get_trap_only_function(func: &Function) -> Option<u8> {
    // Must have exactly one statement in the body
    if func.body.items.len() != 1 {
        return None;
    }
    
    match &func.body.items[0] {
        BlockItem::Statement(Statement::Expression(expr)) => {
            // Check if it's a call to trap() with a literal argument
            if let Expression::Call { function, arguments } = expr {
                if function == "trap" && arguments.len() == 1 {
                    if let Expression::IntLiteral(vector) = &arguments[0] {
                        return Some(*vector as u8);
                    }
                }
            }
            None
        }
        _ => None,
    }
}

fn count_locals_and_calls(block: &Block, local_count: &mut usize, has_calls: &mut bool) {
    for item in &block.items {
        match item {
            BlockItem::Declaration(decl) => {
                *local_count += decl.declarators.len();
            }
            BlockItem::Statement(stmt) => {
                check_statement_for_calls(stmt, local_count, has_calls);
            }
        }
    }
}

fn check_statement_for_calls(stmt: &Statement, local_count: &mut usize, has_calls: &mut bool) {
    match stmt {
        Statement::Expression(expr) => {
            check_expression_for_calls(expr, has_calls);
        }
        Statement::Compound(block) => {
            count_locals_and_calls(block, local_count, has_calls);
        }
        Statement::If { condition, then_branch, else_branch } => {
            check_expression_for_calls(condition, has_calls);
            check_statement_for_calls(then_branch, local_count, has_calls);
            if let Some(else_stmt) = else_branch {
                check_statement_for_calls(else_stmt, local_count, has_calls);
            }
        }
        Statement::While { condition, body } => {
            check_expression_for_calls(condition, has_calls);
            check_statement_for_calls(body, local_count, has_calls);
        }
        Statement::For { init, condition, update, body } => {
            if let Some(ForInit::Declaration(decl)) = init {
                *local_count += decl.declarators.len();
            }
            if let Some(ForInit::Expression(expr)) = init {
                check_expression_for_calls(expr, has_calls);
            }
            if let Some(cond) = condition {
                check_expression_for_calls(cond, has_calls);
            }
            if let Some(upd) = update {
                check_expression_for_calls(upd, has_calls);
            }
            check_statement_for_calls(body, local_count, has_calls);
        }
        Statement::Return(Some(expr)) => {
            check_expression_for_calls(expr, has_calls);
        }
        _ => {}
    }
}

fn check_expression_for_calls(expr: &Expression, has_calls: &mut bool) {
    match expr {
        Expression::Call { function, arguments } => {
            // trap() is an intrinsic, doesn't count as a real call
            if function != "trap" {
                *has_calls = true;
            }
            for arg in arguments {
                check_expression_for_calls(arg, has_calls);
            }
        }
        Expression::Binary { left, right, .. } => {
            check_expression_for_calls(left, has_calls);
            check_expression_for_calls(right, has_calls);
        }
        Expression::Unary { operand, .. } => {
            check_expression_for_calls(operand, has_calls);
        }
        Expression::Assignment { value, .. } => {
            check_expression_for_calls(value, has_calls);
        }
        Expression::Subscript { array, index } => {
            check_expression_for_calls(array, has_calls);
            check_expression_for_calls(index, has_calls);
        }
        _ => {}
    }
}

impl Compiler {
    fn new(options: CompileOptions) -> Self {
        Self {
            options,
            output: String::new(),
            label_counter: 0,
            locals: HashMap::new(),
            local_offset: 0,
            next_reg: 1, // Start with R1 (R0 is for return values/temps)
            use_registers: false,
            data_section: Vec::new(),
            current_function: String::new(),
            defined_functions: std::collections::HashSet::new(),
            defined_globals: std::collections::HashSet::new(),
            string_globals: std::collections::HashSet::new(),
            word_count: 0,
            inlineable_functions: HashMap::new(),
        }
    }

    fn emit(&mut self, line: &str) {
        self.output.push_str(line);
        self.output.push('\n');
    }

    fn emit_comment(&mut self, comment: &str) {
        if self.options.emit_comments {
            self.emit(&format!("; {}", comment));
        }
    }

    fn emit_label(&mut self, label: &str) {
        self.emit(&format!("{}:", label));
    }

    fn emit_instruction(&mut self, instr: &str) {
        self.emit(&format!("    {}", instr));
        self.word_count += 1;
    }

    fn new_label(&mut self, prefix: &str) -> String {
        let label = format!("{}_{}", prefix, self.label_counter);
        self.label_counter += 1;
        label
    }

    fn compile_program(&mut self, program: &Program) -> Result<(), CompileError> {
        // First pass: collect all defined functions, globals, and detect inlineable functions
        for item in &program.items {
            match item {
                TopLevelItem::Function(f) => {
                    self.defined_functions.insert(f.name.clone());
                    
                    // Check if this function is just a trap wrapper
                    if let Some(trap_vector) = get_trap_only_function(f) {
                        self.inlineable_functions.insert(
                            f.name.clone(),
                            InlineableFunction { trap_vector },
                        );
                    }
                }
                TopLevelItem::GlobalDeclaration(d) => {
                    for declarator in &d.declarators {
                        self.defined_globals.insert(declarator.name.clone());
                        // Track globals initialized with string literals
                        if let Some(Initializer::String(_)) = &declarator.initializer {
                            self.string_globals.insert(declarator.name.clone());
                        }
                    }
                }
                TopLevelItem::Include(_) => {}
            }
        }
        
        // Emit origin
        self.emit(&format!(".ORIG x{:04X}", self.options.origin));
        self.emit("");

        // Find main function and other functions
        let mut main_func = None;
        let mut other_funcs = Vec::new();
        let mut globals = Vec::new();

        for item in &program.items {
            match item {
                TopLevelItem::Include(_) => {
                    // Includes should already be expanded; skip if any remain
                }
                TopLevelItem::Function(f) if f.name == "main" => {
                    main_func = Some(f);
                }
                TopLevelItem::Function(f) => {
                    other_funcs.push(f);
                }
                TopLevelItem::GlobalDeclaration(d) => {
                    globals.push(d);
                }
            }
        }

        // Compile main first (it's the entry point)
        if let Some(main) = main_func {
            self.compile_main(main)?;
        }

        // Compile other functions (skip inlineable ones)
        for func in other_funcs {
            // Skip functions that will be inlined
            if self.inlineable_functions.contains_key(&func.name) {
                continue;
            }
            self.emit("");
            self.compile_function(func)?;
        }

        // Emit data section
        if !self.data_section.is_empty() || !globals.is_empty() {
            self.emit("");
            self.emit_comment("Data section");
            
            // Ensure data section starts at even word boundary for LEA alignment
            if self.word_count % 2 != 0 {
                self.emit("    .FILL x0000  ; padding for alignment");
                self.word_count += 1;
            }
            
            for global in globals {
                self.compile_global_declaration(global)?;
            }
            
            // Take ownership to avoid borrow issues
            let data_items = std::mem::take(&mut self.data_section);
            for item in data_items {
                match item {
                    DataItem::String { label, value } => {
                        self.emit_label(&label);
                        self.emit(&format!("    .STRINGZ \"{}\"", escape_string(&value)));
                    }
                    DataItem::Word { label, value } => {
                        self.emit_label(&label);
                        if value < 0 {
                            self.emit(&format!("    .FILL #{}", value));
                        } else {
                            self.emit(&format!("    .FILL x{:04X}", value as u16));
                        }
                    }
                }
            }
        }

        self.emit("");
        self.emit(".END");

        Ok(())
    }

    fn compile_main(&mut self, func: &Function) -> Result<(), CompileError> {
        self.current_function = "main".to_string();
        self.emit_comment("int main()");
        self.emit_label("main");

        // Reset locals for this function
        self.locals.clear();
        self.local_offset = -1; // First local at offset -1 from FP
        self.next_reg = 1; // R1-R4 available for locals
        
        // Check if we can use register allocation
        self.use_registers = is_simple_function(func);
        
        if self.use_registers {
            self.emit_comment("Using register allocation for locals");
        } else {
            // main() is the entry point - no stack frame setup needed
            // Just set R5 = R6 so local variable addressing works
            self.emit_instruction("ADD R5, R6, #0");  // R5 = SP (frame pointer for locals)
        }

        // Compile function body
        self.compile_block(&func.body)?;

        // End of main - halt the machine
        self.emit_label("main_exit");
        self.emit_instruction("HALT");

        Ok(())
    }

    fn compile_function(&mut self, func: &Function) -> Result<(), CompileError> {
        self.current_function = func.name.clone();
        
        self.emit_comment(&format!(
            "{} {}({})",
            type_to_string(&func.return_type),
            func.name,
            func.parameters.iter()
                .map(|p| format!("{} {}", type_to_string(&p.ty), p.name))
                .collect::<Vec<_>>()
                .join(", ")
        ));
        self.emit_label(&func.name);

        // Reset locals
        self.locals.clear();
        self.local_offset = -1;
        self.next_reg = 1;
        
        // For non-main functions, we always need stack frame for R7 (return address)
        // But we can still use registers for locals if it's simple
        self.use_registers = is_simple_function(func) && func.parameters.is_empty();

        // Set up stack frame
        self.emit_comment("Set up stack frame");
        self.emit_instruction("ADD R6, R6, #-2");
        self.emit_instruction("STW R7, R6, #0");
        self.emit_instruction("STW R5, R6, #1");
        self.emit_instruction("ADD R5, R6, #0");

        if self.use_registers {
            self.emit_comment("Using register allocation for locals");
        }

        // Map parameters to positive offsets from frame pointer
        // Parameters are pushed right-to-left by caller, so first param is at FP+2
        for (i, param) in func.parameters.iter().enumerate() {
            self.locals.insert(param.name.clone(), VarLocation::Stack(i as i16 + 2));
        }

        // Compile body
        self.compile_block(&func.body)?;

        // Epilogue
        let exit_label = format!("{}_exit", func.name);
        self.emit_label(&exit_label);
        self.emit_comment("Function epilogue");
        self.emit_instruction("ADD R6, R5, #0");  // SP = FP
        self.emit_instruction("LDW R5, R6, #1");  // Restore old FP
        self.emit_instruction("LDW R7, R6, #0");  // Restore return address
        self.emit_instruction("ADD R6, R6, #2");  // Pop frame
        self.emit_instruction("RET");

        Ok(())
    }

    fn compile_block(&mut self, block: &Block) -> Result<(), CompileError> {
        for item in &block.items {
            match item {
                BlockItem::Declaration(decl) => {
                    self.compile_declaration(decl)?;
                }
                BlockItem::Statement(stmt) => {
                    self.compile_statement(stmt)?;
                }
            }
        }
        Ok(())
    }

    fn compile_declaration(&mut self, decl: &Declaration) -> Result<(), CompileError> {
        for declarator in &decl.declarators {
            // Decide where to allocate this variable
            let location = if self.use_registers && self.next_reg <= 4 {
                // Allocate to a register
                let reg = self.next_reg;
                self.next_reg += 1;
                VarLocation::Register(reg)
            } else {
                // Allocate on stack
                self.emit_instruction("ADD R6, R6, #-1"); // Push space for variable
                let loc = VarLocation::Stack(self.local_offset);
                self.local_offset -= 1;
                loc
            };
            
            // Record variable location
            self.locals.insert(declarator.name.clone(), location);
            
            if let Some(init) = &declarator.initializer {
                self.emit_comment(&format!("{} {} = ...", type_to_string(&decl.ty), declarator.name));
                match init {
                    Initializer::Expression(expr) => {
                        // Evaluate expression into R0
                        self.compile_expression(expr)?;
                        // Store R0 at variable location
                        match location {
                            VarLocation::Register(reg) => {
                                self.emit_instruction(&format!("ADD R{}, R0, #0", reg));
                            }
                            VarLocation::Stack(offset) => {
                                self.emit_instruction(&format!("STW R0, R5, #{}", offset));
                            }
                        }
                    }
                    Initializer::String(s) => {
                        // Create string in data section and store pointer
                        let label = self.new_label("str");
                        self.data_section.push(DataItem::String {
                            label: label.clone(),
                            value: s.clone(),
                        });
                        self.emit_instruction(&format!("LEA R0, {}", label));
                        match location {
                            VarLocation::Register(reg) => {
                                self.emit_instruction(&format!("ADD R{}, R0, #0", reg));
                            }
                            VarLocation::Stack(offset) => {
                                self.emit_instruction(&format!("STW R0, R5, #{}", offset));
                            }
                        }
                    }
                }
            } else {
                self.emit_comment(&format!("{} {} (uninitialized)", type_to_string(&decl.ty), declarator.name));
                // For register-allocated uninitialized vars, we could zero them
                if let VarLocation::Register(reg) = location {
                    self.emit_instruction(&format!("AND R{}, R{}, #0", reg, reg));
                }
            }
        }
        Ok(())
    }

    fn compile_global_declaration(&mut self, decl: &Declaration) -> Result<(), CompileError> {
        for declarator in &decl.declarators {
            self.emit_label(&declarator.name);
            if let Some(init) = &declarator.initializer {
                match init {
                    Initializer::Expression(Expression::IntLiteral(n)) => {
                        self.emit(&format!("    .FILL #{}", n));
                    }
                    Initializer::String(s) => {
                        self.emit(&format!("    .STRINGZ \"{}\"", escape_string(s)));
                    }
                    _ => {
                        // Default to 0 for complex expressions
                        self.emit("    .FILL #0");
                    }
                }
            } else {
                self.emit("    .FILL #0");
            }
        }
        Ok(())
    }

    fn compile_statement(&mut self, stmt: &Statement) -> Result<(), CompileError> {
        match stmt {
            Statement::Compound(block) => {
                self.compile_block(block)?;
            }
            Statement::Expression(expr) => {
                self.compile_expression(expr)?;
            }
            Statement::If { condition, then_branch, else_branch } => {
                self.compile_if(condition, then_branch, else_branch.as_deref())?;
            }
            Statement::While { condition, body } => {
                self.compile_while(condition, body)?;
            }
            Statement::For { init, condition, update, body } => {
                self.compile_for(init, condition, update, body)?;
            }
            Statement::Return(expr) => {
                self.compile_return(expr.as_ref())?;
            }
            Statement::Empty => {}
        }
        Ok(())
    }

    fn compile_if(
        &mut self,
        condition: &Expression,
        then_branch: &Statement,
        else_branch: Option<&Statement>,
    ) -> Result<(), CompileError> {
        let else_label = self.new_label("else");
        let end_label = self.new_label("endif");

        self.emit_comment("if (...)");
        self.compile_expression(condition)?;
        
        // Branch to else if R0 == 0
        self.emit_instruction("ADD R0, R0, #0"); // Set condition codes
        self.emit_instruction(&format!("BRz {}", if else_branch.is_some() { &else_label } else { &end_label }));

        // Then branch
        self.compile_statement(then_branch)?;

        if let Some(else_stmt) = else_branch {
            self.emit_instruction(&format!("BR {}", end_label)); // Skip else
            self.emit_label(&else_label);
            self.emit_comment("else");
            self.compile_statement(else_stmt)?;
        }

        self.emit_label(&end_label);
        Ok(())
    }

    fn compile_while(&mut self, condition: &Expression, body: &Statement) -> Result<(), CompileError> {
        let loop_label = self.new_label("while");
        let end_label = self.new_label("endwhile");

        self.emit_label(&loop_label);
        self.emit_comment("while (...)");
        self.compile_expression(condition)?;
        
        self.emit_instruction("ADD R0, R0, #0");
        self.emit_instruction(&format!("BRz {}", end_label));

        self.compile_statement(body)?;
        
        self.emit_instruction(&format!("BR {}", loop_label));
        self.emit_label(&end_label);
        
        Ok(())
    }

    fn compile_for(
        &mut self,
        init: &Option<ForInit>,
        condition: &Option<Expression>,
        update: &Option<Expression>,
        body: &Statement,
    ) -> Result<(), CompileError> {
        let loop_label = self.new_label("for");
        let end_label = self.new_label("endfor");

        // Init
        if let Some(init) = init {
            match init {
                ForInit::Declaration(decl) => {
                    self.compile_declaration(decl)?;
                }
                ForInit::Expression(expr) => {
                    self.compile_expression(expr)?;
                }
            }
        }

        self.emit_label(&loop_label);
        
        // Condition
        if let Some(cond) = condition {
            self.emit_comment("for condition");
            self.compile_expression(cond)?;
            self.emit_instruction("ADD R0, R0, #0");
            self.emit_instruction(&format!("BRz {}", end_label));
        }

        // Body
        self.compile_statement(body)?;

        // Update
        if let Some(upd) = update {
            self.emit_comment("for update");
            self.compile_expression(upd)?;
        }

        self.emit_instruction(&format!("BR {}", loop_label));
        self.emit_label(&end_label);

        Ok(())
    }

    fn compile_return(&mut self, expr: Option<&Expression>) -> Result<(), CompileError> {
        self.emit_comment("return");
        
        if let Some(e) = expr {
            self.compile_expression(e)?;
            // Return value is in R0
        }

        // Jump to function epilogue
        if self.current_function == "main" {
            self.emit_instruction("BR main_exit");
        } else {
            self.emit_instruction(&format!("BR {}_exit", self.current_function));
        }

        Ok(())
    }

    /// Compile an expression, leaving the result in R0
    fn compile_expression(&mut self, expr: &Expression) -> Result<(), CompileError> {
        match expr {
            Expression::IntLiteral(n) => {
                self.load_immediate(*n)?;
            }
            Expression::CharLiteral(c) => {
                self.load_immediate(*c as i32)?;
            }
            Expression::StringLiteral(s) => {
                let label = self.new_label("str");
                self.data_section.push(DataItem::String {
                    label: label.clone(),
                    value: s.clone(),
                });
                self.emit_instruction(&format!("LEA R0, {}", label));
            }
            Expression::Identifier(name) => {
                if let Some(&location) = self.locals.get(name) {
                    match location {
                        VarLocation::Register(reg) => {
                            self.emit_instruction(&format!("ADD R0, R{}, #0", reg));
                        }
                        VarLocation::Stack(offset) => {
                            self.emit_instruction(&format!("LDW R0, R5, #{}", offset));
                        }
                    }
                } else if self.defined_globals.contains(name) {
                    // Global variable
                    self.emit_instruction(&format!("LEA R0, {}", name));
                    // String-initialized globals point directly to the string data,
                    // so we don't need to dereference - LEA gives us the address directly
                    if !self.string_globals.contains(name) {
                        self.emit_instruction("LDW R0, R0, #0");
                    }
                } else {
                    return Err(CompileError {
                        message: format!("undefined variable '{}'", name),
                    });
                }
            }
            Expression::Binary { op, left, right } => {
                self.compile_binary_op(*op, left, right)?;
            }
            Expression::Unary { op, operand } => {
                self.compile_unary_op(*op, operand)?;
            }
            Expression::Assignment { op, target, value } => {
                self.compile_assignment(*op, target, value)?;
            }
            Expression::Call { function, arguments } => {
                self.compile_call(function, arguments)?;
            }
            Expression::PostIncrement(name) => {
                self.compile_post_inc_dec(name, true)?;
            }
            Expression::PostDecrement(name) => {
                self.compile_post_inc_dec(name, false)?;
            }
            Expression::PreIncrement(name) => {
                self.compile_pre_inc_dec(name, true)?;
            }
            Expression::PreDecrement(name) => {
                self.compile_pre_inc_dec(name, false)?;
            }
            Expression::Subscript { array, index } => {
                // array[index] = *(array + index)
                self.compile_expression(array)?;
                self.emit_instruction("ADD R1, R0, #0"); // R1 = array base
                self.compile_expression(index)?;
                // LC-3B uses word addressing, so multiply index by 2
                self.emit_instruction("ADD R0, R0, R0"); // R0 = index * 2
                self.emit_instruction("ADD R0, R1, R0"); // R0 = base + offset
                self.emit_instruction("LDW R0, R0, #0"); // R0 = *R0
            }
        }
        Ok(())
    }

    fn load_immediate(&mut self, value: i32) -> Result<(), CompileError> {
        if value >= -16 && value <= 15 {
            // Can use AND to zero, then ADD immediate
            self.emit_instruction("AND R0, R0, #0");
            if value != 0 {
                self.emit_instruction(&format!("ADD R0, R0, #{}", value));
            }
        } else {
            // Need to load from memory
            let label = self.new_label("const");
            self.data_section.push(DataItem::Word {
                label: label.clone(),
                value,
            });
            self.emit_instruction(&format!("LEA R0, {}", label));
            self.emit_instruction("LDW R0, R0, #0");
        }
        Ok(())
    }

    fn compile_binary_op(
        &mut self,
        op: BinaryOp,
        left: &Expression,
        right: &Expression,
    ) -> Result<(), CompileError> {
        // Evaluate left into R0, push it, evaluate right into R0, pop left into R1
        self.compile_expression(left)?;
        self.emit_instruction("ADD R6, R6, #-1"); // Push
        self.emit_instruction("STW R0, R6, #0");
        
        self.compile_expression(right)?;
        self.emit_instruction("ADD R1, R0, #0"); // R1 = right
        self.emit_instruction("LDW R0, R6, #0"); // R0 = left
        self.emit_instruction("ADD R6, R6, #1"); // Pop

        match op {
            BinaryOp::Add => {
                self.emit_instruction("ADD R0, R0, R1");
            }
            BinaryOp::Sub => {
                // R0 = R0 - R1 = R0 + (~R1 + 1)
                self.emit_instruction("NOT R1, R1");
                self.emit_instruction("ADD R1, R1, #1");
                self.emit_instruction("ADD R0, R0, R1");
            }
            BinaryOp::BitAnd => {
                self.emit_instruction("AND R0, R0, R1");
            }
            BinaryOp::BitOr => {
                // R0 | R1 = ~(~R0 & ~R1)
                self.emit_instruction("NOT R0, R0");
                self.emit_instruction("NOT R1, R1");
                self.emit_instruction("AND R0, R0, R1");
                self.emit_instruction("NOT R0, R0");
            }
            BinaryOp::BitXor => {
                // R0 ^ R1 = (R0 & ~R1) | (~R0 & R1)
                self.emit_instruction("ADD R2, R0, #0"); // R2 = R0
                self.emit_instruction("NOT R3, R1");     // R3 = ~R1
                self.emit_instruction("AND R2, R2, R3"); // R2 = R0 & ~R1
                self.emit_instruction("NOT R0, R0");     // R0 = ~R0
                self.emit_instruction("AND R0, R0, R1"); // R0 = ~R0 & R1
                // OR the results
                self.emit_instruction("NOT R0, R0");
                self.emit_instruction("NOT R2, R2");
                self.emit_instruction("AND R0, R0, R2");
                self.emit_instruction("NOT R0, R0");
            }
            BinaryOp::Equal | BinaryOp::NotEqual => {
                // Compare: R0 - R1, check if zero
                self.emit_instruction("NOT R1, R1");
                self.emit_instruction("ADD R1, R1, #1");
                self.emit_instruction("ADD R0, R0, R1");
                
                let true_label = self.new_label("true");
                let end_label = self.new_label("cmp_end");
                
                if op == BinaryOp::Equal {
                    self.emit_instruction(&format!("BRz {}", true_label));
                } else {
                    self.emit_instruction(&format!("BRnp {}", true_label));
                }
                
                self.emit_instruction("AND R0, R0, #0"); // false = 0
                self.emit_instruction(&format!("BR {}", end_label));
                self.emit_label(&true_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1"); // true = 1
                self.emit_label(&end_label);
            }
            BinaryOp::Less | BinaryOp::GreaterEqual => {
                // R0 < R1: check if R0 - R1 < 0
                self.emit_instruction("NOT R1, R1");
                self.emit_instruction("ADD R1, R1, #1");
                self.emit_instruction("ADD R0, R0, R1");
                
                let true_label = self.new_label("true");
                let end_label = self.new_label("cmp_end");
                
                if op == BinaryOp::Less {
                    self.emit_instruction(&format!("BRn {}", true_label));
                } else {
                    self.emit_instruction(&format!("BRzp {}", true_label));
                }
                
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction(&format!("BR {}", end_label));
                self.emit_label(&true_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1");
                self.emit_label(&end_label);
            }
            BinaryOp::Greater | BinaryOp::LessEqual => {
                // R0 > R1: check if R0 - R1 > 0
                self.emit_instruction("NOT R1, R1");
                self.emit_instruction("ADD R1, R1, #1");
                self.emit_instruction("ADD R0, R0, R1");
                
                let true_label = self.new_label("true");
                let end_label = self.new_label("cmp_end");
                
                if op == BinaryOp::Greater {
                    self.emit_instruction(&format!("BRp {}", true_label));
                } else {
                    self.emit_instruction(&format!("BRnz {}", true_label));
                }
                
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction(&format!("BR {}", end_label));
                self.emit_label(&true_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1");
                self.emit_label(&end_label);
            }
            BinaryOp::LogicalAnd => {
                let false_label = self.new_label("and_false");
                let end_label = self.new_label("and_end");
                
                // Left is already evaluated, check if false
                self.emit_instruction("ADD R0, R0, #0");
                self.emit_instruction(&format!("BRz {}", false_label));
                
                // Evaluate right
                self.compile_expression(right)?;
                self.emit_instruction("ADD R0, R0, #0");
                self.emit_instruction(&format!("BRz {}", false_label));
                
                // Both true
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1");
                self.emit_instruction(&format!("BR {}", end_label));
                
                self.emit_label(&false_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_label(&end_label);
            }
            BinaryOp::LogicalOr => {
                let true_label = self.new_label("or_true");
                let end_label = self.new_label("or_end");
                
                self.emit_instruction("ADD R0, R0, #0");
                self.emit_instruction(&format!("BRnp {}", true_label));
                
                // Evaluate right
                self.compile_expression(right)?;
                self.emit_instruction("ADD R0, R0, #0");
                self.emit_instruction(&format!("BRnp {}", true_label));
                
                // Both false
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction(&format!("BR {}", end_label));
                
                self.emit_label(&true_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1");
                self.emit_label(&end_label);
            }
            BinaryOp::ShiftLeft => {
                // Shift left by adding to itself R1 times
                // This is a loop-based implementation
                let loop_label = self.new_label("shl_loop");
                let end_label = self.new_label("shl_end");
                
                // R0 = value, R1 = count
                self.emit_label(&loop_label);
                self.emit_instruction("ADD R1, R1, #0");
                self.emit_instruction(&format!("BRz {}", end_label));
                self.emit_instruction("ADD R0, R0, R0"); // R0 *= 2
                self.emit_instruction("ADD R1, R1, #-1");
                self.emit_instruction(&format!("BR {}", loop_label));
                self.emit_label(&end_label);
            }
            BinaryOp::ShiftRight => {
                // Shift right is more complex, would need a loop
                // For now, emit a comment and basic implementation
                self.emit_comment("Shift right (simplified)");
                let loop_label = self.new_label("shr_loop");
                let end_label = self.new_label("shr_end");
                
                // Use RSHFL instruction if available, otherwise loop
                // LC-3B has RSHFL, let's use it
                // Actually LC-3B RSHFL shifts by amount in imm4
                // For variable shift, we need a loop
                self.emit_label(&loop_label);
                self.emit_instruction("ADD R1, R1, #0");
                self.emit_instruction(&format!("BRz {}", end_label));
                self.emit_instruction("RSHFL R0, R0, #1");
                self.emit_instruction("ADD R1, R1, #-1");
                self.emit_instruction(&format!("BR {}", loop_label));
                self.emit_label(&end_label);
            }
            BinaryOp::Mul | BinaryOp::Div | BinaryOp::Mod => {
                self.emit_comment(&format!("TODO: {:?} requires subroutine", op));
                // Would need multiplication/division subroutines
            }
        }
        Ok(())
    }

    fn compile_unary_op(&mut self, op: UnaryOp, operand: &Expression) -> Result<(), CompileError> {
        self.compile_expression(operand)?;
        
        match op {
            UnaryOp::Negate => {
                self.emit_instruction("NOT R0, R0");
                self.emit_instruction("ADD R0, R0, #1");
            }
            UnaryOp::BitNot => {
                self.emit_instruction("NOT R0, R0");
            }
            UnaryOp::LogicalNot => {
                let true_label = self.new_label("not_true");
                let end_label = self.new_label("not_end");
                
                self.emit_instruction("ADD R0, R0, #0");
                self.emit_instruction(&format!("BRz {}", true_label));
                self.emit_instruction("AND R0, R0, #0"); // was non-zero, return 0
                self.emit_instruction(&format!("BR {}", end_label));
                self.emit_label(&true_label);
                self.emit_instruction("AND R0, R0, #0");
                self.emit_instruction("ADD R0, R0, #1"); // was zero, return 1
                self.emit_label(&end_label);
            }
            UnaryOp::Deref => {
                self.emit_instruction("LDW R0, R0, #0");
            }
            UnaryOp::AddressOf => {
                // For now, only works with identifiers (handled elsewhere)
                self.emit_comment("Address-of (requires identifier operand)");
            }
        }
        Ok(())
    }

    fn compile_assignment(
        &mut self,
        op: AssignOp,
        target: &str,
        value: &Expression,
    ) -> Result<(), CompileError> {
        let target_location = self.locals.get(target).copied();
        
        // Validate that the target variable exists
        if target_location.is_none() && !self.defined_globals.contains(target) {
            return Err(CompileError {
                message: format!("undefined variable '{}'", target),
            });
        }
        
        match op {
            AssignOp::Assign => {
                self.compile_expression(value)?;
            }
            AssignOp::AddAssign | AssignOp::SubAssign | AssignOp::AndAssign
            | AssignOp::OrAssign | AssignOp::XorAssign => {
                // Load current value
                match target_location {
                    Some(VarLocation::Register(reg)) => {
                        self.emit_instruction(&format!("ADD R0, R{}, #0", reg));
                    }
                    Some(VarLocation::Stack(offset)) => {
                        self.emit_instruction(&format!("LDW R0, R5, #{}", offset));
                    }
                    None => {
                        self.emit_instruction(&format!("LEA R0, {}", target));
                        self.emit_instruction("LDW R0, R0, #0");
                    }
                }
                
                // Push current value
                self.emit_instruction("ADD R6, R6, #-1");
                self.emit_instruction("STW R0, R6, #0");
                
                // Evaluate RHS
                self.compile_expression(value)?;
                self.emit_instruction("ADD R1, R0, #0"); // R1 = new value
                
                // Pop original value
                self.emit_instruction("LDW R0, R6, #0");
                self.emit_instruction("ADD R6, R6, #1");
                
                // Apply operation
                match op {
                    AssignOp::AddAssign => {
                        self.emit_instruction("ADD R0, R0, R1");
                    }
                    AssignOp::SubAssign => {
                        self.emit_instruction("NOT R1, R1");
                        self.emit_instruction("ADD R1, R1, #1");
                        self.emit_instruction("ADD R0, R0, R1");
                    }
                    AssignOp::AndAssign => {
                        self.emit_instruction("AND R0, R0, R1");
                    }
                    AssignOp::OrAssign => {
                        self.emit_instruction("NOT R0, R0");
                        self.emit_instruction("NOT R1, R1");
                        self.emit_instruction("AND R0, R0, R1");
                        self.emit_instruction("NOT R0, R0");
                    }
                    AssignOp::XorAssign => {
                        self.emit_instruction("ADD R2, R0, #0");
                        self.emit_instruction("NOT R3, R1");
                        self.emit_instruction("AND R2, R2, R3");
                        self.emit_instruction("NOT R0, R0");
                        self.emit_instruction("AND R0, R0, R1");
                        self.emit_instruction("NOT R0, R0");
                        self.emit_instruction("NOT R2, R2");
                        self.emit_instruction("AND R0, R0, R2");
                        self.emit_instruction("NOT R0, R0");
                    }
                    _ => {}
                }
            }
        }

        // Store result
        match target_location {
            Some(VarLocation::Register(reg)) => {
                self.emit_instruction(&format!("ADD R{}, R0, #0", reg));
            }
            Some(VarLocation::Stack(offset)) => {
                self.emit_instruction(&format!("STW R0, R5, #{}", offset));
            }
            None => {
                // Global variable - need to use a temp register for address
                self.emit_instruction("ADD R1, R0, #0"); // Save value
                self.emit_instruction(&format!("LEA R0, {}", target));
                self.emit_instruction("STW R1, R0, #0");
                self.emit_instruction("ADD R0, R1, #0"); // Restore R0
            }
        }

        Ok(())
    }

    fn compile_call(&mut self, function: &str, arguments: &[Expression]) -> Result<(), CompileError> {
        // Check for trap() intrinsic - trap(vector) emits TRAP instruction
        if function == "trap" {
            if arguments.len() != 1 {
                return Err(CompileError { message: "trap() takes exactly 1 argument".to_string() });
            }
            // Argument should be a literal trap vector
            if let Expression::IntLiteral(vector) = &arguments[0] {
                self.emit_instruction(&format!("TRAP x{:02X}", vector));
            } else {
                return Err(CompileError { message: "trap() argument must be a constant".to_string() });
            }
            return Ok(());
        }

        // Validate that the function is defined
        if !self.defined_functions.contains(function) {
            return Err(CompileError { 
                message: format!("undefined function '{}' (did you forget to #include a header?)", function) 
            });
        }

        // Check if this function can be inlined (simple trap wrapper)
        if let Some(inline_info) = self.inlineable_functions.get(function).cloned() {
            self.emit_comment(&format!("{}() [inlined]", function));
            
            // Evaluate arguments into R0 (for functions like putchar that take a char)
            // The trap will use whatever is in R0
            for arg in arguments.iter() {
                self.compile_expression(arg)?;
            }
            
            // Emit the trap directly
            self.emit_instruction(&format!("TRAP x{:02X}", inline_info.trap_vector));
            return Ok(());
        }

        // Regular function call
        self.emit_comment(&format!("Call {}()", function));
        
        // Push arguments right-to-left
        for arg in arguments.iter().rev() {
            self.compile_expression(arg)?;
            self.emit_instruction("ADD R6, R6, #-1");
            self.emit_instruction("STW R0, R6, #0");
        }

        // Call function
        self.emit_instruction(&format!("JSR {}", function));

        // Pop arguments
        if !arguments.is_empty() {
            self.emit_instruction(&format!("ADD R6, R6, #{}", arguments.len()));
        }

        // Return value is in R0
        Ok(())
    }

    fn compile_post_inc_dec(&mut self, name: &str, increment: bool) -> Result<(), CompileError> {
        let location = self.locals.get(name).copied();
        
        // Validate that the variable exists
        if location.is_none() && !self.defined_globals.contains(name) {
            return Err(CompileError {
                message: format!("undefined variable '{}'", name),
            });
        }
        
        // Load current value into R0 (this is the return value)
        match location {
            Some(VarLocation::Register(reg)) => {
                self.emit_instruction(&format!("ADD R0, R{}, #0", reg));
            }
            Some(VarLocation::Stack(offset)) => {
                self.emit_instruction(&format!("LDW R0, R5, #{}", offset));
            }
            None => {
                self.emit_instruction(&format!("LEA R1, {}", name));
                self.emit_instruction("LDW R0, R1, #0");
            }
        }

        // For register-allocated vars, we can increment directly
        match location {
            Some(VarLocation::Register(reg)) => {
                // Increment/decrement the register directly
                if increment {
                    self.emit_instruction(&format!("ADD R{}, R{}, #1", reg, reg));
                } else {
                    self.emit_instruction(&format!("ADD R{}, R{}, #-1", reg, reg));
                }
                // R0 still has original value
            }
            Some(VarLocation::Stack(offset)) => {
                // Save original value
                self.emit_instruction("ADD R1, R0, #0");
                // Increment/decrement
                if increment {
                    self.emit_instruction("ADD R1, R1, #1");
                } else {
                    self.emit_instruction("ADD R1, R1, #-1");
                }
                // Store new value
                self.emit_instruction(&format!("STW R1, R5, #{}", offset));
            }
            None => {
                // Global variable
                self.emit_instruction("ADD R1, R0, #0");
                if increment {
                    self.emit_instruction("ADD R1, R1, #1");
                } else {
                    self.emit_instruction("ADD R1, R1, #-1");
                }
                self.emit_instruction("ADD R2, R0, #0"); // Save return value
                self.emit_instruction(&format!("LEA R0, {}", name));
                self.emit_instruction("STW R1, R0, #0");
                self.emit_instruction("ADD R0, R2, #0"); // Restore return value
            }
        }

        // R0 still has original value
        Ok(())
    }

    fn compile_pre_inc_dec(&mut self, name: &str, increment: bool) -> Result<(), CompileError> {
        let location = self.locals.get(name).copied();
        
        // Validate that the variable exists
        if location.is_none() && !self.defined_globals.contains(name) {
            return Err(CompileError {
                message: format!("undefined variable '{}'", name),
            });
        }
        
        match location {
            Some(VarLocation::Register(reg)) => {
                // Increment/decrement the register directly
                if increment {
                    self.emit_instruction(&format!("ADD R{}, R{}, #1", reg, reg));
                } else {
                    self.emit_instruction(&format!("ADD R{}, R{}, #-1", reg, reg));
                }
                // Copy to R0 for return value
                self.emit_instruction(&format!("ADD R0, R{}, #0", reg));
            }
            Some(VarLocation::Stack(offset)) => {
                // Load current value
                self.emit_instruction(&format!("LDW R0, R5, #{}", offset));
                // Increment/decrement
                if increment {
                    self.emit_instruction("ADD R0, R0, #1");
                } else {
                    self.emit_instruction("ADD R0, R0, #-1");
                }
                // Store new value
                self.emit_instruction(&format!("STW R0, R5, #{}", offset));
            }
            None => {
                // Global variable
                self.emit_instruction(&format!("LEA R1, {}", name));
                self.emit_instruction("LDW R0, R1, #0");
                if increment {
                    self.emit_instruction("ADD R0, R0, #1");
                } else {
                    self.emit_instruction("ADD R0, R0, #-1");
                }
                self.emit_instruction(&format!("LEA R1, {}", name));
                self.emit_instruction("STW R0, R1, #0");
            }
        }

        // R0 has new value (which is also the return value)
        Ok(())
    }
}

fn type_to_string(ty: &Type) -> &'static str {
    match ty {
        Type::Void => "void",
        Type::Int => "int",
        Type::Uint16 => "uint16_t",
        Type::Short { unsigned: true } => "unsigned short",
        Type::Short { unsigned: false } => "short",
        Type::Char => "char",
        Type::Pointer(_) => "ptr",
    }
}

fn escape_string(s: &str) -> String {
    let mut result = String::new();
    for c in s.chars() {
        match c {
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            c if c.is_ascii_graphic() || c == ' ' => result.push(c),
            c => result.push_str(&format!("\\x{:02X}", c as u8)),
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_main() {
        let source = "int main() {}";
        let result = compile(source, &CompileOptions::default()).unwrap();
        assert!(result.contains(".ORIG x3000"));
        assert!(result.contains("main:"));
        assert!(result.contains("HALT"));
        assert!(result.contains(".END"));
    }

    #[test]
    fn test_return_value() {
        let source = "int main() { return 42; }";
        let result = compile(source, &CompileOptions::default()).unwrap();
        assert!(result.contains("main:"));
        // Should load 42 somehow (might be via .FILL)
        println!("{}", result);
    }

    #[test]
    fn test_variable_declaration() {
        let source = "int main() { int x = 5; return x; }";
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains("ADD R0, R0, #5"));
    }

    #[test]
    fn test_addition() {
        let source = "int main() { int a = 1; int b = 2; int c = a + b; return c; }";
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        // Should have ADD instruction for a + b
        assert!(result.contains("ADD R0, R0, R1"));
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
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains("for_"));
        assert!(result.contains("endfor_"));
    }

    #[test]
    fn test_void_function() {
        let source = r#"
            void helper() {
                int x = 1;
            }
            int main() {
                helper();
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains("helper:"));
        assert!(result.contains("JSR helper"));
        assert!(result.contains("RET"));
    }

    #[test]
    fn test_string_literal() {
        let source = r#"
            int main() {
                char* msg = "Hello";
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains(".STRINGZ \"Hello\""));
    }

    #[test]
    fn test_global_string_pointer() {
        // Global string pointers should use LEA only, not LEA+LDW
        // because the label points directly to the string data
        let source = r#"
            #include <lc3b-io.h>
            char *hello = "Hello, LC-3b!";
            int main() {
                puts(hello);
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        
        // Should have the string at the hello label
        assert!(result.contains("hello:"));
        assert!(result.contains(".STRINGZ \"Hello, LC-3b!\""));
        
        // Should have LEA R0, hello
        assert!(result.contains("LEA R0, hello"));
        
        // Should NOT have LDW R0, R0, #0 immediately after LEA R0, hello
        // (that would be double-dereferencing)
        let lines: Vec<&str> = result.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            if line.contains("LEA R0, hello") {
                if i + 1 < lines.len() {
                    assert!(
                        !lines[i + 1].contains("LDW R0, R0, #0"),
                        "Should not dereference string global pointer"
                    );
                }
            }
        }
    }

    #[test]
    fn test_if_else() {
        let source = r#"
            int main() {
                int x = 5;
                if (x > 0) {
                    return 1;
                } else {
                    return 0;
                }
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains("else_"));
        assert!(result.contains("endif_"));
    }

    #[test]
    fn test_include_io() {
        let source = r#"
            #include <lc3b-io.h>

            int main() {
                puts("Hello, LC-3b!");
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        // puts is a simple trap wrapper, so it should be inlined
        assert!(result.contains("puts() [inlined]"));
        // Should emit TRAP x22 directly (no JSR)
        assert!(result.contains("TRAP x22"));
        // Should NOT have the puts function defined (it's inlined)
        assert!(!result.contains("puts:"));
    }

    #[test]
    fn test_trap_intrinsic() {
        let source = r#"
            int main() {
                trap(0x25);
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        assert!(result.contains("TRAP x25"));
    }

    #[test]
    fn test_register_allocation_simple() {
        // Simple function with 2 locals, no calls -> should use registers
        let source = r#"
            int main() {
                int a = 5;
                int b = 10;
                return a + b;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        // Should use register allocation (no STW/LDW for locals)
        assert!(result.contains("Using register allocation"));
        // Variables should be in R1 and R2
        assert!(result.contains("ADD R1, R0, #0")); // a = 5 -> R1
        assert!(result.contains("ADD R2, R0, #0")); // b = 10 -> R2
        // Should NOT have frame pointer setup for main with register alloc
        assert!(!result.contains("ADD R5, R6, #0"));
    }

    #[test]
    fn test_register_allocation_for_loop() {
        // For loop with 2 locals (sum, i), no calls -> should use registers
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
        assert!(result.contains("Using register allocation"));
        // i++ should be a simple register increment
        assert!(result.contains("ADD R2, R2, #1")); // i++
    }

    #[test]
    fn test_stack_allocation_with_calls() {
        // Function with calls -> should use stack
        let source = r#"
            void helper() {}
            int main() {
                int x = 5;
                helper();
                return x;
            }
        "#;
        let result = compile(source, &CompileOptions::default()).unwrap();
        println!("{}", result);
        // main has a call, so should NOT use register allocation
        assert!(!result.contains("; Using register allocation for locals\nmain"));
        // Should use stack for x
        assert!(result.contains("STW R0, R5"));
    }

    #[test]
    fn test_undefined_function_error() {
        let source = r#"
            int main() {
                puts("Hello");
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("undefined function 'puts'"));
        assert!(err.message.contains("#include"));
    }

    #[test]
    fn test_undefined_variable_error() {
        let source = r#"
            int main() {
                return x;
            }
        "#;
        let result = compile(source, &CompileOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("undefined variable 'x'"));
    }

    #[test]
    fn test_defined_function_works() {
        let source = r#"
            #include <lc3b-io.h>
            int main() {
                puts("Hello");
                return 0;
            }
        "#;
        let result = compile(source, &CompileOptions::default());
        assert!(result.is_ok());
    }

    #[test]
    fn test_hello_world_assembles() {
        // This is the default C example from the UI
        let source = r#"#include <lc3b-io.h>

// Hello World in C for LC-3b

int main() {
    puts("Hello, LC-3b!");
    return 0;
}
"#;
        let asm = compile(source, &CompileOptions::default()).unwrap();
        println!("Generated assembly:\n{}", asm);
        
        // Now try to assemble it
        let assembled = lc3b_assembler::assemble(&asm);
        if let Err(e) = &assembled {
            panic!("Assembly failed: {}\n\nGenerated assembly:\n{}", e, asm);
        }
        assert!(assembled.is_ok());
    }
}
