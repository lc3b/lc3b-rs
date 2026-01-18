//! AST type definitions for the LC-3B C subset

/// A complete translation unit (source file)
#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub items: Vec<TopLevelItem>,
}

/// Top-level items in a program
#[derive(Debug, Clone, PartialEq)]
pub enum TopLevelItem {
    Function(Function),
    GlobalDeclaration(Declaration),
}

/// A function definition
#[derive(Debug, Clone, PartialEq)]
pub struct Function {
    pub return_type: Type,
    pub name: String,
    pub parameters: Vec<Parameter>,
    pub body: Block,
}

/// A function parameter
#[derive(Debug, Clone, PartialEq)]
pub struct Parameter {
    pub ty: Type,
    pub name: String,
}

/// Type specifiers
#[derive(Debug, Clone, PartialEq)]
pub enum Type {
    Void,
    Int,
    Uint16,
    Short { unsigned: bool },
    Char,
    Pointer(Box<Type>),
}

/// A block of statements
#[derive(Debug, Clone, PartialEq)]
pub struct Block {
    pub items: Vec<BlockItem>,
}

/// Items that can appear in a block
#[derive(Debug, Clone, PartialEq)]
pub enum BlockItem {
    Declaration(Declaration),
    Statement(Statement),
}

/// A variable declaration
#[derive(Debug, Clone, PartialEq)]
pub struct Declaration {
    pub ty: Type,
    pub declarators: Vec<Declarator>,
}

/// A single variable declarator with optional initializer
#[derive(Debug, Clone, PartialEq)]
pub struct Declarator {
    pub name: String,
    pub initializer: Option<Initializer>,
}

/// Initializer for a variable
#[derive(Debug, Clone, PartialEq)]
pub enum Initializer {
    Expression(Expression),
    String(String),
}

/// Statements
#[derive(Debug, Clone, PartialEq)]
pub enum Statement {
    Compound(Block),
    Expression(Expression),
    If {
        condition: Expression,
        then_branch: Box<Statement>,
        else_branch: Option<Box<Statement>>,
    },
    While {
        condition: Expression,
        body: Box<Statement>,
    },
    For {
        init: Option<ForInit>,
        condition: Option<Expression>,
        update: Option<Expression>,
        body: Box<Statement>,
    },
    Return(Option<Expression>),
    Empty,
}

/// For loop initializer
#[derive(Debug, Clone, PartialEq)]
pub enum ForInit {
    Declaration(Declaration),
    Expression(Expression),
}

/// Expressions
#[derive(Debug, Clone, PartialEq)]
pub enum Expression {
    /// Integer literal
    IntLiteral(i32),
    /// Character literal
    CharLiteral(char),
    /// String literal
    StringLiteral(String),
    /// Variable reference
    Identifier(String),
    /// Binary operation
    Binary {
        op: BinaryOp,
        left: Box<Expression>,
        right: Box<Expression>,
    },
    /// Unary operation
    Unary {
        op: UnaryOp,
        operand: Box<Expression>,
    },
    /// Assignment
    Assignment {
        op: AssignOp,
        target: String,
        value: Box<Expression>,
    },
    /// Function call
    Call {
        function: String,
        arguments: Vec<Expression>,
    },
    /// Array subscript
    Subscript {
        array: Box<Expression>,
        index: Box<Expression>,
    },
    /// Post-increment
    PostIncrement(String),
    /// Post-decrement
    PostDecrement(String),
    /// Pre-increment
    PreIncrement(String),
    /// Pre-decrement
    PreDecrement(String),
}

/// Binary operators
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BinaryOp {
    // Arithmetic
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    // Bitwise
    BitAnd,
    BitOr,
    BitXor,
    ShiftLeft,
    ShiftRight,
    // Comparison
    Equal,
    NotEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    // Logical
    LogicalAnd,
    LogicalOr,
}

/// Unary operators
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum UnaryOp {
    Negate,
    BitNot,
    LogicalNot,
    Deref,
    AddressOf,
}

/// Assignment operators
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AssignOp {
    Assign,
    AddAssign,
    SubAssign,
    AndAssign,
    OrAssign,
    XorAssign,
}
