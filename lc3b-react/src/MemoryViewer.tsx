import { useState } from "react";

export interface MemoryViewerProps {
  programCounter: number;
  readMemory: (addr: number) => number;
}

function formatHex(value: number, digits: number = 4): string {
  return "0x" + value.toString(16).toUpperCase().padStart(digits, "0");
}

function formatBinary(value: number): string {
  return value.toString(2).padStart(16, "0");
}

function formatSigned(value: number, bits: number = 16): string {
  const signBit = 1 << (bits - 1);
  if (value >= signBit) {
    return (value - (1 << bits)).toString();
  }
  return value.toString();
}

function registerName(index: number): string {
  return `R${index & 0x7}`;
}

interface BinarySegment {
  bits: string;
  label: string;
  colorClass: string;
}

function getBinaryBreakdown(word: number): BinarySegment[] {
  const binary = formatBinary(word);
  const op = (word >> 12) & 0xf;
  const bit5 = (word >> 5) & 0x1;
  const bit11 = (word >> 11) & 0x1;

  // Opcode is always bits [15:12]
  const opcode = binary.slice(0, 4);

  switch (op) {
    case 0b0000: // BR
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 5), label: "n", colorClass: "text-accent-secondary" },
        { bits: binary.slice(5, 6), label: "z", colorClass: "text-accent-secondary" },
        { bits: binary.slice(6, 7), label: "p", colorClass: "text-accent-secondary" },
        { bits: binary.slice(7, 16), label: "PCoffset9", colorClass: "text-accent-tertiary" },
      ];
    case 0b0001: // ADD
    case 0b0101: // AND
      if (bit5) {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
          { bits: binary.slice(7, 10), label: "SR1", colorClass: "text-accent-quaternary" },
          { bits: binary.slice(10, 11), label: "1", colorClass: "text-text-muted" },
          { bits: binary.slice(11, 16), label: "imm5", colorClass: "text-accent-tertiary" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
          { bits: binary.slice(7, 10), label: "SR1", colorClass: "text-accent-quaternary" },
          { bits: binary.slice(10, 13), label: "0xx", colorClass: "text-text-muted" },
          { bits: binary.slice(13, 16), label: "SR2", colorClass: "text-accent-quinary" },
        ];
      }
    case 0b0010: // LDB
    case 0b0011: // STB
    case 0b0110: // LDR
    case 0b0111: // STR
    case 0b1010: // LDI
    case 0b1011: // STI
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 7), label: op === 0b0011 || op === 0b0111 || op === 0b1011 ? "SR" : "DR", colorClass: "text-accent-secondary" },
        { bits: binary.slice(7, 10), label: "BaseR", colorClass: "text-accent-quaternary" },
        { bits: binary.slice(10, 16), label: "offset6", colorClass: "text-accent-tertiary" },
      ];
    case 0b0100: // JSR/JSRR
      if (bit11) {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 5), label: "1", colorClass: "text-text-muted" },
          { bits: binary.slice(5, 16), label: "PCoffset11", colorClass: "text-accent-tertiary" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 5), label: "0", colorClass: "text-text-muted" },
          { bits: binary.slice(5, 7), label: "xx", colorClass: "text-text-muted" },
          { bits: binary.slice(7, 10), label: "BaseR", colorClass: "text-accent-quaternary" },
          { bits: binary.slice(10, 16), label: "xxxxxx", colorClass: "text-text-muted" },
        ];
      }
    case 0b1000: // RTI
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 16), label: "(unused)", colorClass: "text-text-muted" },
      ];
    case 0b1001: // XOR/NOT
      if (bit5) {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
          { bits: binary.slice(7, 10), label: "SR", colorClass: "text-accent-quaternary" },
          { bits: binary.slice(10, 11), label: "1", colorClass: "text-text-muted" },
          { bits: binary.slice(11, 16), label: "imm5", colorClass: "text-accent-tertiary" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
          { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
          { bits: binary.slice(7, 10), label: "SR1", colorClass: "text-accent-quaternary" },
          { bits: binary.slice(10, 13), label: "0xx", colorClass: "text-text-muted" },
          { bits: binary.slice(13, 16), label: "SR2", colorClass: "text-accent-quinary" },
        ];
      }
    case 0b1100: // JMP/RET
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 7), label: "xxx", colorClass: "text-text-muted" },
        { bits: binary.slice(7, 10), label: "BaseR", colorClass: "text-accent-quaternary" },
        { bits: binary.slice(10, 16), label: "xxxxxx", colorClass: "text-text-muted" },
      ];
    case 0b1101: // SHF
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
        { bits: binary.slice(7, 10), label: "SR", colorClass: "text-accent-quaternary" },
        { bits: binary.slice(10, 12), label: "type", colorClass: "text-accent-quinary" },
        { bits: binary.slice(12, 16), label: "amount4", colorClass: "text-accent-tertiary" },
      ];
    case 0b1110: // LEA
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 7), label: "DR", colorClass: "text-accent-secondary" },
        { bits: binary.slice(7, 16), label: "PCoffset9", colorClass: "text-accent-tertiary" },
      ];
    case 0b1111: // TRAP
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 8), label: "xxxx", colorClass: "text-text-muted" },
        { bits: binary.slice(8, 16), label: "trapvect8", colorClass: "text-accent-tertiary" },
      ];
    default:
      return [
        { bits: opcode, label: "opcode", colorClass: "text-accent-primary" },
        { bits: binary.slice(4, 16), label: "???", colorClass: "text-text-muted" },
      ];
  }
}

interface DecodedInstruction {
  opcode: string;
  variant: string;
  operands: string;
  comment: string;
}

function decodeInstruction(word: number): DecodedInstruction {
  const op = (word >> 12) & 0xf;
  const dr = (word >> 9) & 0x7;
  const sr1 = (word >> 6) & 0x7;
  const sr2 = word & 0x7;
  const imm5 = word & 0x1f;
  const imm5Signed = imm5 >= 16 ? imm5 - 32 : imm5;
  const offset6 = word & 0x3f;
  const offset6Signed = offset6 >= 32 ? offset6 - 64 : offset6;
  const offset9 = word & 0x1ff;
  const offset9Signed = offset9 >= 256 ? offset9 - 512 : offset9;
  const offset11 = word & 0x7ff;
  const offset11Signed = offset11 >= 1024 ? offset11 - 2048 : offset11;
  const trapvect8 = word & 0xff;
  const bit5 = (word >> 5) & 0x1;
  const bit11 = (word >> 11) & 0x1;
  const n = (word >> 11) & 0x1;
  const z = (word >> 10) & 0x1;
  const p = (word >> 9) & 0x1;

  switch (op) {
    case 0b0000: { // BR
      const cond = (n ? "n" : "") + (z ? "z" : "") + (p ? "p" : "");
      return {
        opcode: "BR",
        variant: `Br(${cond || "nzp"})`,
        operands: `${offset9Signed}`,
        comment: `Branch${cond ? ` if ${cond}` : ""} to PC + ${offset9Signed * 2}`,
      };
    }
    case 0b0001: // ADD
      if (bit5) {
        return {
          opcode: "ADD",
          variant: "AddImm",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} + ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "ADD",
          variant: "AddReg",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} + ${registerName(sr2)}`,
        };
      }
    case 0b0010: // LDB
      return {
        opcode: "LDB",
        variant: "Ldb",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `${registerName(dr)} = mem[${registerName(sr1)} + ${offset6Signed}] (byte)`,
      };
    case 0b0011: // STB
      return {
        opcode: "STB",
        variant: "Stb",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `mem[${registerName(sr1)} + ${offset6Signed}] = ${registerName(dr)} (byte)`,
      };
    case 0b0100: // JSR/JSRR
      if (bit11) {
        return {
          opcode: "JSR",
          variant: "Jsr",
          operands: `${offset11Signed}`,
          comment: `R7 = PC; PC = PC + ${offset11Signed * 2}`,
        };
      } else {
        return {
          opcode: "JSRR",
          variant: "Jsrr",
          operands: `${registerName(sr1)}`,
          comment: `R7 = PC; PC = ${registerName(sr1)}`,
        };
      }
    case 0b0101: // AND
      if (bit5) {
        return {
          opcode: "AND",
          variant: "AndImm",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} & ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "AND",
          variant: "AndReg",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} & ${registerName(sr2)}`,
        };
      }
    case 0b0110: // LDR (LDW in LC-3b)
      return {
        opcode: "LDR",
        variant: "Ldr",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `${registerName(dr)} = mem[${registerName(sr1)} + ${offset6Signed * 2}] (word)`,
      };
    case 0b0111: // STR (STW in LC-3b)
      return {
        opcode: "STR",
        variant: "Str",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `mem[${registerName(sr1)} + ${offset6Signed * 2}] = ${registerName(dr)} (word)`,
      };
    case 0b1000: // RTI
      return {
        opcode: "RTI",
        variant: "Rti",
        operands: "",
        comment: "Return from interrupt",
      };
    case 0b1001: // XOR/NOT
      if (bit5 && imm5 === 0x1f) {
        return {
          opcode: "NOT",
          variant: "Not",
          operands: `${registerName(dr)}, ${registerName(sr1)}`,
          comment: `${registerName(dr)} = ~${registerName(sr1)}`,
        };
      } else if (bit5) {
        return {
          opcode: "XOR",
          variant: "XorImm",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} ^ ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "XOR",
          variant: "XorReg",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} ^ ${registerName(sr2)}`,
        };
      }
    case 0b1010: // LDI
      return {
        opcode: "LDI",
        variant: "Ldi",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `${registerName(dr)} = mem[mem[${registerName(sr1)} + ${offset6Signed * 2}]]`,
      };
    case 0b1011: // STI
      return {
        opcode: "STI",
        variant: "Sti",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        comment: `mem[mem[${registerName(sr1)} + ${offset6Signed * 2}]] = ${registerName(dr)}`,
      };
    case 0b1100: // JMP/RET
      if (sr1 === 7) {
        return {
          opcode: "RET",
          variant: "Ret",
          operands: "",
          comment: "Return (PC = R7)",
        };
      } else {
        return {
          opcode: "JMP",
          variant: "Jmp",
          operands: `${registerName(sr1)}`,
          comment: `PC = ${registerName(sr1)}`,
        };
      }
    case 0b1101: // SHF
      const shfType = (word >> 4) & 0x3;
      const shfAmount = word & 0xf;
      if (shfType === 0) {
        return {
          opcode: "LSHF",
          variant: "Shf(LSHF)",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} << ${shfAmount}`,
        };
      } else if (shfType === 1) {
        return {
          opcode: "RSHFL",
          variant: "Shf(RSHFL)",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} >>> ${shfAmount} (logical)`,
        };
      } else {
        return {
          opcode: "RSHFA",
          variant: "Shf(RSHFA)",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          comment: `${registerName(dr)} = ${registerName(sr1)} >> ${shfAmount} (arithmetic)`,
        };
      }
    case 0b1110: // LEA
      return {
        opcode: "LEA",
        variant: "Lea",
        operands: `${registerName(dr)}, #${offset9Signed}`,
        comment: `${registerName(dr)} = PC + ${offset9Signed * 2}`,
      };
    case 0b1111: // TRAP
      const trapNames: { [key: number]: string } = {
        0x20: "GETC",
        0x21: "OUT",
        0x22: "PUTS",
        0x23: "IN",
        0x24: "PUTSP",
        0x25: "HALT",
      };
      const trapName = trapNames[trapvect8] || `x${trapvect8.toString(16).toUpperCase()}`;
      return {
        opcode: "TRAP",
        variant: `Trap(${trapName})`,
        operands: trapName,
        comment: `System call: ${trapName}`,
      };
    default:
      return {
        opcode: "???",
        variant: "Unknown",
        operands: "",
        comment: "Reserved/Unknown opcode",
      };
  }
}

interface BinaryBreakdownProps {
  word: number;
}

function BinaryBreakdown({ word }: BinaryBreakdownProps) {
  const segments = getBinaryBreakdown(word);

  return (
    <div className="mt-2 pt-2 border-t border-border-color">
      <div className="text-text-muted mb-1">Encoding:</div>
      <div className="flex font-mono text-sm">
        {segments.map((seg, i) => (
          <span
            key={i}
            className={`px-0.5 ${seg.colorClass}`}
            title={seg.label}
          >
            {seg.bits}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px]">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-sm ${seg.colorClass.replace('text-', 'bg-')}`}
            />
            <span className="text-text-muted">{seg.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface MemoryRowProps {
  addr: number;
  value: number;
  isPC: boolean;
}

function MemoryRow({ addr, value, isPC }: MemoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const decoded = decodeInstruction(value);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex gap-3 px-2 py-1 rounded cursor-pointer select-none ${
          isPC
            ? "bg-bg-highlight border-l-[3px] border-accent-primary"
            : "hover:bg-bg-secondary"
        }`}
      >
        <span className="text-text-muted min-w-[50px]">{formatHex(addr)}</span>
        <span className="font-mono text-accent-secondary min-w-[50px]">{formatHex(value)}</span>
        <span className="text-accent-primary font-semibold min-w-[45px]">{decoded.opcode}</span>
        <span className="text-text-primary flex-1 truncate">{decoded.operands}</span>
        <span className={`text-text-muted text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </div>
      {expanded && (
        <div className="ml-2 mt-1 mb-2 bg-bg-primary border border-border-color rounded-md p-3 text-xs">
          <div className="mb-2 pb-2 border-b border-border-color">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-text-muted">Variant:</span>
              <code className="font-mono text-accent-primary bg-bg-secondary px-1.5 py-0.5 rounded">
                {decoded.variant}
              </code>
            </div>
            <div>
              <span className="text-text-muted">Comment: </span>
              <span className="text-text-primary">{decoded.comment}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-text-muted">Address: </span>
              <span className="font-mono text-accent-secondary select-all">{formatHex(addr)}</span>
            </div>
            <div>
              <span className="text-text-muted">Hex: </span>
              <span className="font-mono text-accent-secondary select-all">{formatHex(value)}</span>
            </div>
            <div>
              <span className="text-text-muted">Decimal: </span>
              <span className="font-mono text-accent-secondary select-all">{value}</span>
            </div>
            <div>
              <span className="text-text-muted">Signed: </span>
              <span className="font-mono text-accent-secondary select-all">{formatSigned(value)}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-text-muted">Binary: </span>
            <span className="font-mono text-accent-secondary select-all">{formatBinary(value)}</span>
          </div>
          <BinaryBreakdown word={value} />
        </div>
      )}
    </div>
  );
}

function MemoryViewer({ programCounter, readMemory }: MemoryViewerProps) {
  // Show 16 words centered on PC (PC-8 to PC+7)
  const startAddr = Math.max(0, programCounter - 8);
  const endAddr = Math.min(0xffff, startAddr + 15);

  const rows = [];
  for (let addr = startAddr; addr <= endAddr; addr++) {
    const value = readMemory(addr);
    rows.push(
      <MemoryRow
        key={addr}
        addr={addr}
        value={value}
        isPC={addr === programCounter}
      />
    );
  }

  return (
    <div className="mt-8 mb-4">
      <div className="panel-title">Memory</div>
      <div className="bg-bg-primary rounded-md p-2 font-mono text-xs max-h-[350px] overflow-y-auto">
        {rows.length > 0 ? (
          rows
        ) : (
          <div className="text-text-muted italic p-2 text-center">
            Load a program to view memory
          </div>
        )}
      </div>
    </div>
  );
}

export default MemoryViewer;
