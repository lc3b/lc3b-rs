import { useRef } from "react";

interface InstructionInfo {
  name: string;
  variants: {
    name: string;
    syntax: string;
    encoding: string;
    description: string;
  }[];
  summary: string;
}

const instructions: InstructionInfo[] = [
  {
    name: "ADD",
    summary: "Add two values and store the result in a destination register. Sets condition codes.",
    variants: [
      {
        name: "AddReg",
        syntax: "ADD DR, SR1, SR2",
        encoding: "0001 DR SR1 0 00 SR2",
        description: "DR = SR1 + SR2. Adds the contents of SR1 and SR2, stores result in DR.",
      },
      {
        name: "AddImm",
        syntax: "ADD DR, SR1, imm5",
        encoding: "0001 DR SR1 1 imm5",
        description: "DR = SR1 + SEXT(imm5). Adds SR1 and a sign-extended 5-bit immediate.",
      },
    ],
  },
  {
    name: "AND",
    summary: "Bitwise AND of two values. Sets condition codes.",
    variants: [
      {
        name: "AndReg",
        syntax: "AND DR, SR1, SR2",
        encoding: "0101 DR SR1 0 00 SR2",
        description: "DR = SR1 AND SR2. Bitwise AND of SR1 and SR2.",
      },
      {
        name: "AndImm",
        syntax: "AND DR, SR1, imm5",
        encoding: "0101 DR SR1 1 imm5",
        description: "DR = SR1 AND SEXT(imm5). Bitwise AND of SR1 and sign-extended immediate.",
      },
    ],
  },
  {
    name: "BR",
    summary: "Conditional branch based on condition codes (N, Z, P). If any specified condition matches, PC is updated.",
    variants: [
      {
        name: "BR",
        syntax: "BRnzp PCoffset9",
        encoding: "0000 n z p PCoffset9",
        description: "If (n AND N) OR (z AND Z) OR (p AND P), then PC = PC + LSHF(SEXT(PCoffset9), 1).",
      },
    ],
  },
  {
    name: "JMP",
    summary: "Unconditional jump to address in base register.",
    variants: [
      {
        name: "JMP",
        syntax: "JMP BaseR",
        encoding: "1100 000 BaseR 000000",
        description: "PC = BaseR. Unconditional jump to the address contained in BaseR.",
      },
    ],
  },
  {
    name: "JSR",
    summary: "Jump to subroutine. Saves return address in R7, then jumps to target.",
    variants: [
      {
        name: "JSR",
        syntax: "JSR PCoffset11",
        encoding: "0100 1 PCoffset11",
        description: "R7 = PC; PC = PC + LSHF(SEXT(PCoffset11), 1). Jump with PC-relative offset.",
      },
    ],
  },
  {
    name: "JSRR",
    summary: "Jump to subroutine via register. Saves return address in R7.",
    variants: [
      {
        name: "JSRR",
        syntax: "JSRR BaseR",
        encoding: "0100 0 00 BaseR 000000",
        description: "R7 = PC; PC = BaseR. Jump to address in register.",
      },
    ],
  },
  {
    name: "LDB",
    summary: "Load byte from memory. Sign-extends the byte to 16 bits.",
    variants: [
      {
        name: "LDB",
        syntax: "LDB DR, BaseR, boffset6",
        encoding: "0010 DR BaseR boffset6",
        description: "DR = SEXT(mem[BaseR + SEXT(boffset6)]). Load byte from memory, sign-extend to 16 bits.",
      },
    ],
  },
  {
    name: "LDI",
    summary: "Load indirect. Address of data is stored at the computed address.",
    variants: [
      {
        name: "LDI",
        syntax: "LDI DR, BaseR, offset6",
        encoding: "1010 DR BaseR offset6",
        description: "DR = mem[mem[BaseR + LSHF(SEXT(offset6), 1)]]. Double indirection load.",
      },
    ],
  },
  {
    name: "LDW",
    summary: "Load word from memory using base register plus offset.",
    variants: [
      {
        name: "LDW",
        syntax: "LDW DR, BaseR, offset6",
        encoding: "0110 DR BaseR offset6",
        description: "DR = mem[BaseR + LSHF(SEXT(offset6), 1)]. Load word using base+offset.",
      },
    ],
  },
  {
    name: "LEA",
    summary: "Load effective address. Computes address without accessing memory.",
    variants: [
      {
        name: "LEA",
        syntax: "LEA DR, PCoffset9",
        encoding: "1110 DR PCoffset9",
        description: "DR = PC + LSHF(SEXT(PCoffset9), 1). Compute address relative to PC.",
      },
    ],
  },
  {
    name: "RET",
    summary: "Return from subroutine. Jumps to address in R7.",
    variants: [
      {
        name: "RET",
        syntax: "RET",
        encoding: "1100 000 111 000000",
        description: "PC = R7. Return from subroutine (special case of JMP R7).",
      },
    ],
  },
  {
    name: "RTI",
    summary: "Return from interrupt. Restores PC and PSR from supervisor stack. Requires supervisor mode.",
    variants: [
      {
        name: "RTI",
        syntax: "RTI",
        encoding: "1000 000000000000",
        description: "PC = mem[R6]; R6++; PSR = mem[R6]; R6++. Privileged instruction for interrupt handling.",
      },
    ],
  },
  {
    name: "SHF",
    summary: "Shift register left or right by specified amount. Sets condition codes.",
    variants: [
      {
        name: "LSHF",
        syntax: "LSHF DR, SR, amount4",
        encoding: "1101 DR SR 0 0 amount4",
        description: "DR = LSHF(SR, amount4). Left shift, zero fill on the right.",
      },
      {
        name: "RSHFL",
        syntax: "RSHFL DR, SR, amount4",
        encoding: "1101 DR SR 0 1 amount4",
        description: "DR = RSHF(SR, amount4, 0). Right shift logical, zero fill on the left.",
      },
      {
        name: "RSHFA",
        syntax: "RSHFA DR, SR, amount4",
        encoding: "1101 DR SR 1 1 amount4",
        description: "DR = RSHF(SR, amount4, SR[15]). Right shift arithmetic, sign extend on the left.",
      },
    ],
  },
  {
    name: "STB",
    summary: "Store byte to memory. Stores low 8 bits of source register.",
    variants: [
      {
        name: "STB",
        syntax: "STB SR, BaseR, boffset6",
        encoding: "0011 SR BaseR boffset6",
        description: "mem[BaseR + SEXT(boffset6)] = SR[7:0]. Store low byte to memory.",
      },
    ],
  },
  {
    name: "STI",
    summary: "Store indirect. Address of destination is stored at computed address.",
    variants: [
      {
        name: "STI",
        syntax: "STI SR, BaseR, offset6",
        encoding: "1011 SR BaseR offset6",
        description: "mem[mem[BaseR + LSHF(SEXT(offset6), 1)]] = SR. Double indirection store.",
      },
    ],
  },
  {
    name: "STW",
    summary: "Store word to memory using base register plus offset.",
    variants: [
      {
        name: "STW",
        syntax: "STW SR, BaseR, offset6",
        encoding: "0111 SR BaseR offset6",
        description: "mem[BaseR + LSHF(SEXT(offset6), 1)] = SR. Store word to memory.",
      },
    ],
  },
  {
    name: "TRAP",
    summary: "System call. Invokes operating system service routine.",
    variants: [
      {
        name: "TRAP",
        syntax: "TRAP trapvect8",
        encoding: "1111 0000 trapvect8",
        description: "R7 = PC; PC = mem[ZEXT(trapvect8) << 1]. Common traps: GETC (x20), OUT (x21), PUTS (x22), IN (x23), PUTSP (x24), HALT (x25).",
      },
    ],
  },
  {
    name: "XOR",
    summary: "Bitwise XOR of two values. NOT is a special case (XOR with -1). Sets condition codes.",
    variants: [
      {
        name: "XorReg",
        syntax: "XOR DR, SR1, SR2",
        encoding: "1001 DR SR1 0 00 SR2",
        description: "DR = SR1 XOR SR2. Bitwise exclusive OR of SR1 and SR2.",
      },
      {
        name: "XorImm",
        syntax: "XOR DR, SR1, imm5",
        encoding: "1001 DR SR1 1 imm5",
        description: "DR = SR1 XOR SEXT(imm5). Bitwise XOR of SR1 and sign-extended immediate.",
      },
      {
        name: "NOT",
        syntax: "NOT DR, SR",
        encoding: "1001 DR SR 1 11111",
        description: "DR = NOT(SR). Bitwise complement, encoded as XOR DR, SR, #-1.",
      },
    ],
  },
];

function Instructions() {
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToInstruction = (name: string) => {
    const ref = sectionRefs.current[name];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-accent-primary mb-2">LC-3b Instruction Set</h1>
      <p className="text-text-muted mb-6">
        Complete reference for all {instructions.length} LC-3b instructions
      </p>

      {/* Quick Reference Index */}
      <div className="mb-8 p-4 bg-bg-tertiary border-2 border-border-color" style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Quick Reference</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 font-mono text-sm">
          {instructions.flatMap((inst) =>
            inst.variants.map((variant) => (
              <button
                key={`${inst.name}-${variant.name}`}
                onClick={() => scrollToInstruction(inst.name)}
                className="text-left px-2 py-1 hover:bg-bg-secondary transition-colors text-accent-primary"
              >
                <span className="font-semibold">{variant.syntax.split(" ")[0]}</span>
                <span className="text-text-muted text-xs ml-1">
                  {variant.syntax.split(" ").slice(1).join(" ")}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        {instructions.map((inst) => (
          <div
            key={inst.name}
            ref={(el) => (sectionRefs.current[inst.name] = el)}
            className="bg-bg-tertiary p-4 border-l-4 border-accent-secondary scroll-mt-4"
            style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
          >
            <h2 className="text-xl font-bold text-accent-primary mb-2">{inst.name}</h2>
            <p className="text-text-primary mb-4">{inst.summary}</p>

            <div className="space-y-3">
              {inst.variants.map((variant) => (
                <div key={variant.name} className="bg-bg-primary p-3 border border-border-color">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-accent-secondary font-semibold">
                      {variant.name}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-text-muted">Syntax: </span>
                      <code className="font-mono text-accent-primary">{variant.syntax}</code>
                    </div>
                    <div>
                      <span className="text-text-muted">Encoding: </span>
                      <code className="font-mono text-text-muted">{variant.encoding}</code>
                    </div>
                    <div className="text-text-secondary">{variant.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-bg-primary border-2 border-border-color" style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}>
        <h3 className="text-lg font-semibold text-accent-secondary mb-2">Legend</h3>
        <ul className="text-sm text-text-primary space-y-1">
          <li><code className="text-accent-primary">DR</code> - Destination Register (3 bits)</li>
          <li><code className="text-accent-primary">SR, SR1, SR2</code> - Source Register (3 bits)</li>
          <li><code className="text-accent-primary">BaseR</code> - Base Register (3 bits)</li>
          <li><code className="text-accent-primary">imm5</code> - 5-bit immediate, sign-extended</li>
          <li><code className="text-accent-primary">offset6</code> - 6-bit offset, sign-extended and left-shifted</li>
          <li><code className="text-accent-primary">boffset6</code> - 6-bit byte offset, sign-extended (no shift)</li>
          <li><code className="text-accent-primary">PCoffset9</code> - 9-bit PC-relative offset</li>
          <li><code className="text-accent-primary">PCoffset11</code> - 11-bit PC-relative offset</li>
          <li><code className="text-accent-primary">amount4</code> - 4-bit shift amount (0-15)</li>
          <li><code className="text-accent-primary">SEXT</code> - Sign-extend to 16 bits</li>
          <li><code className="text-accent-primary">LSHF</code> - Left shift by 1 (multiply by 2 for word alignment)</li>
        </ul>
      </div>
    </div>
  );
}

export default Instructions;
