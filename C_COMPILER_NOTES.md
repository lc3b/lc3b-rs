How do I summon a WASM C compiler in to existence? Claude Opus 4.5, naturally:

```
Add a lc3b-c-grammar crate. It should be a pest project similar to lc3b-assembler but the grammar should cover a basic C subset. I want to make parsable:

 * `int main() {}` (later we will make this build a `.ORIG ...; .HALT` skeleton)
 * `void myFunction() {}` which will make a subroutine snippet suitable for calling in to later
 * parse addition and subtraction expressions
 * for loop
 * uint16_t (should we also support short?)
 * parsing strings so we can later emit `.STRINGZ ...`
```

then:

```
What are the steps to go from C to something runnable?
 * parse with this new pest grammer
 * walk the grammer and emit LC-3b lc3b::Instruction values (is this step considered a "compiler"?)
```

then I got to choose from:

```
Architecture Options

**Option A: Emit `Instruction` directly (what you described)**

C source → parse → AST → compile → Vec<Instruction> → Vec<u16> → VM

**Option B: Emit assembly text, then assemble**

C source → parse → AST → codegen → asm string → lc3b-assembler → Vec<u16> → VM

Option A is cleaner and avoids a text round-trip. Option B is easier to debug (you can print the assembly).
```

to which I simply declared:

```
let's do a lc3b-c-ast crate in that case. In there you can capture all the relevant AST structs and the routines for walking the Pairs<Rule> and building the structs.

and yes, we want to emit assembly text. folks learning lc-3b will mostly care about how their C looks as individual instructions. let's put this logic in to a `lc3b-c-compiler` crate.
```
