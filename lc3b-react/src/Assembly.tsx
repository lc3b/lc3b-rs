interface DirectiveInfo {
  name: string;
  syntax: string;
  description: string;
  example: string;
  notes?: string;
}

const directives: DirectiveInfo[] = [
  {
    name: ".ORIG",
    syntax: ".ORIG xNNNN",
    description:
      "Sets the starting address for the program. All subsequent instructions and data will be placed starting at this address. If omitted, defaults to x3000.",
    example: `.ORIG x3000
    ADD R0, R0, #1`,
    notes: "Must use hexadecimal notation with 'x' prefix (e.g., x3000, x4000).",
  },
  {
    name: ".END",
    syntax: ".END",
    description:
      "Marks the end of the assembly source. The assembler stops processing when it encounters this directive. Any code after .END is ignored.",
    example: `.ORIG x3000
    ADD R0, R0, #1
.END
    ADD R1, R1, #2  ; This is ignored`,
  },
  {
    name: ".FILL",
    syntax: ".FILL value",
    description:
      "Allocates one word (16 bits) of storage and initializes it to the specified value. The value can be a hexadecimal number, decimal number, or a label reference.",
    example: `DATA:   .FILL x1234     ; Hex value
NEG1:   .FILL #-1       ; Decimal -1 (becomes xFFFF)
PTR:    .FILL TARGET    ; Address of TARGET label`,
    notes:
      "Useful for storing constants, pointers to other locations, or initializing data.",
  },
  {
    name: ".BLKW",
    syntax: ".BLKW count",
    description:
      "Allocates a block of words (Block of Words). Reserves 'count' consecutive memory locations, all initialized to zero.",
    example: `ARRAY:  .BLKW #10   ; Reserve 10 words (decimal)
BUFFER: .BLKW x20   ; Reserve 32 words (hex)`,
    notes:
      "Commonly used for arrays, buffers, or reserving space for runtime data.",
  },
  {
    name: ".STRINGZ",
    syntax: '.STRINGZ "string"',
    description:
      "Allocates storage for a null-terminated string. Each character occupies one word (16 bits), followed by a word containing zero (null terminator).",
    example: `MSG:    .STRINGZ "Hello"  ; 6 words: 'H','e','l','l','o',0
EMPTY:  .STRINGZ ""       ; 1 word: just the null terminator`,
    notes:
      'The string must be enclosed in double quotes. The null terminator is added automatically.',
  },
];

const syntaxRules = [
  {
    title: "Comments",
    description: "Start with a semicolon (;). Everything after the semicolon on that line is ignored.",
    example: `ADD R0, R0, #1  ; This is a comment
; This entire line is a comment`,
  },
  {
    title: "Labels",
    description:
      "Symbolic names for memory addresses. Must start with a letter, can contain letters, digits, and underscores. End with a colon when defined.",
    example: `LOOP:   ADD R0, R0, #1
        BRp LOOP        ; Reference without colon`,
  },
  {
    title: "Numbers",
    description:
      "Decimal numbers are prefixed with # (e.g., #10, #-5). Hexadecimal numbers are prefixed with x (e.g., x3000, xFF).",
    example: `ADD R0, R0, #5      ; Decimal immediate
.ORIG x3000         ; Hex address
.FILL #-1           ; Negative decimal`,
  },
  {
    title: "Registers",
    description: "Eight general-purpose registers: R0 through R7. Case insensitive (R0 and r0 are equivalent).",
    example: `ADD R0, R1, R2      ; All uppercase
add r0, r1, r2      ; All lowercase (also valid)`,
  },
];

function Assembly() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-accent-primary mb-2">
        LC-3b Assembly Language
      </h1>
      <p className="text-text-muted mb-6">
        Reference for assembler directives and syntax rules
      </p>

      {/* Directives Section */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-accent-secondary mb-4 border-b border-border-color pb-2">
          Assembler Directives
        </h2>
        <p className="text-text-secondary mb-4">
          Directives are commands to the assembler that don't generate machine
          instructions. They control how the program is assembled and where data
          is placed in memory.
        </p>

        <div className="space-y-6">
          {directives.map((directive) => (
            <div
              key={directive.name}
              className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-accent-secondary"
            >
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-accent-primary font-mono">
                  {directive.name}
                </h3>
              </div>
              <div className="mb-3">
                <span className="text-text-muted text-sm">Syntax: </span>
                <code className="font-mono text-accent-primary">
                  {directive.syntax}
                </code>
              </div>
              <p className="text-text-primary mb-3">{directive.description}</p>
              <div className="bg-bg-primary rounded-md p-3 mb-2">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                  Example
                </div>
                <pre className="font-mono text-sm text-text-secondary whitespace-pre-wrap">
                  {directive.example}
                </pre>
              </div>
              {directive.notes && (
                <p className="text-sm text-text-muted italic">
                  {directive.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Syntax Rules Section */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-accent-secondary mb-4 border-b border-border-color pb-2">
          Syntax Rules
        </h2>

        <div className="space-y-4">
          {syntaxRules.map((rule) => (
            <div
              key={rule.title}
              className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-border-color"
            >
              <h3 className="text-md font-semibold text-accent-primary mb-2">
                {rule.title}
              </h3>
              <p className="text-text-primary mb-3">{rule.description}</p>
              <div className="bg-bg-primary rounded-md p-3">
                <pre className="font-mono text-sm text-text-secondary whitespace-pre-wrap">
                  {rule.example}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Program Structure Section */}
      <section>
        <h2 className="text-xl font-semibold text-accent-secondary mb-4 border-b border-border-color pb-2">
          Program Structure
        </h2>

        <div className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-accent-primary">
          <p className="text-text-primary mb-4">
            A typical LC-3b assembly program has the following structure:
          </p>
          <div className="bg-bg-primary rounded-md p-4">
            <pre className="font-mono text-sm text-text-secondary whitespace-pre-wrap">
{`.ORIG x3000         ; 1. Origin: where program starts

; 2. Code section
START:  LEA R0, MSG     ; Load address of message
        ; ... more instructions ...
        BRnzp DONE      ; Jump to end

; 3. Data section
MSG:    .STRINGZ "Hello, World!"
COUNT:  .FILL #10
ARRAY:  .BLKW #5

DONE:   ; ... cleanup code ...

.END                ; 4. End of program`}
            </pre>
          </div>
          <ul className="mt-4 text-sm text-text-secondary space-y-2">
            <li>
              <strong className="text-text-primary">1. Origin:</strong> Specifies
              where in memory the program will be loaded
            </li>
            <li>
              <strong className="text-text-primary">2. Code section:</strong>{" "}
              Instructions that will be executed
            </li>
            <li>
              <strong className="text-text-primary">3. Data section:</strong>{" "}
              Constants, strings, and reserved memory
            </li>
            <li>
              <strong className="text-text-primary">4. End:</strong> Marks the end
              of assembly source
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default Assembly;
