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
  color: string;
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
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 5), label: "n", color: "#4ecca3" },
        { bits: binary.slice(5, 6), label: "z", color: "#4ecca3" },
        { bits: binary.slice(6, 7), label: "p", color: "#4ecca3" },
        { bits: binary.slice(7, 16), label: "PCoffset9", color: "#f0a500" },
      ];
    case 0b0001: // ADD
    case 0b0101: // AND
      if (bit5) {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
          { bits: binary.slice(7, 10), label: "SR1", color: "#00d9ff" },
          { bits: binary.slice(10, 11), label: "1", color: "#888" },
          { bits: binary.slice(11, 16), label: "imm5", color: "#f0a500" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
          { bits: binary.slice(7, 10), label: "SR1", color: "#00d9ff" },
          { bits: binary.slice(10, 13), label: "0xx", color: "#888" },
          { bits: binary.slice(13, 16), label: "SR2", color: "#ff6b9d" },
        ];
      }
    case 0b0010: // LDB
    case 0b0011: // STB
    case 0b0110: // LDR
    case 0b0111: // STR
    case 0b1010: // LDI
    case 0b1011: // STI
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 7), label: op === 0b0011 || op === 0b0111 || op === 0b1011 ? "SR" : "DR", color: "#4ecca3" },
        { bits: binary.slice(7, 10), label: "BaseR", color: "#00d9ff" },
        { bits: binary.slice(10, 16), label: "offset6", color: "#f0a500" },
      ];
    case 0b0100: // JSR/JSRR
      if (bit11) {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 5), label: "1", color: "#888" },
          { bits: binary.slice(5, 16), label: "PCoffset11", color: "#f0a500" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 5), label: "0", color: "#888" },
          { bits: binary.slice(5, 7), label: "xx", color: "#888" },
          { bits: binary.slice(7, 10), label: "BaseR", color: "#00d9ff" },
          { bits: binary.slice(10, 16), label: "xxxxxx", color: "#888" },
        ];
      }
    case 0b1000: // RTI
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 16), label: "(unused)", color: "#888" },
      ];
    case 0b1001: // XOR/NOT
      if (bit5) {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
          { bits: binary.slice(7, 10), label: "SR", color: "#00d9ff" },
          { bits: binary.slice(10, 11), label: "1", color: "#888" },
          { bits: binary.slice(11, 16), label: "imm5", color: "#f0a500" },
        ];
      } else {
        return [
          { bits: opcode, label: "opcode", color: "#e94560" },
          { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
          { bits: binary.slice(7, 10), label: "SR1", color: "#00d9ff" },
          { bits: binary.slice(10, 13), label: "0xx", color: "#888" },
          { bits: binary.slice(13, 16), label: "SR2", color: "#ff6b9d" },
        ];
      }
    case 0b1100: // JMP/RET
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 7), label: "xxx", color: "#888" },
        { bits: binary.slice(7, 10), label: "BaseR", color: "#00d9ff" },
        { bits: binary.slice(10, 16), label: "xxxxxx", color: "#888" },
      ];
    case 0b1101: // SHF
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
        { bits: binary.slice(7, 10), label: "SR", color: "#00d9ff" },
        { bits: binary.slice(10, 12), label: "type", color: "#ff6b9d" },
        { bits: binary.slice(12, 16), label: "amount4", color: "#f0a500" },
      ];
    case 0b1110: // LEA
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 7), label: "DR", color: "#4ecca3" },
        { bits: binary.slice(7, 16), label: "PCoffset9", color: "#f0a500" },
      ];
    case 0b1111: // TRAP
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 8), label: "xxxx", color: "#888" },
        { bits: binary.slice(8, 16), label: "trapvect8", color: "#f0a500" },
      ];
    default:
      return [
        { bits: opcode, label: "opcode", color: "#e94560" },
        { bits: binary.slice(4, 16), label: "???", color: "#888" },
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
    <div className="mt-2 pt-2 border-t border-[#333]">
      <div className="text-[#888] mb-1">Encoding:</div>
      <div className="flex font-mono text-sm">
        {segments.map((seg, i) => (
          <span
            key={i}
            className="px-0.5"
            style={{ color: seg.color }}
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
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[#888]">{seg.label}</span>
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
            ? "bg-[#0f3460] border-l-[3px] border-[#e94560]"
            : "hover:bg-[#1a1a2e]"
        }`}
      >
        <span className="text-[#888] min-w-[50px]">{formatHex(addr)}</span>
        <span className="font-mono text-[#4ecca3] min-w-[50px]">{formatHex(value)}</span>
        <span className="text-[#e94560] font-semibold min-w-[45px]">{decoded.opcode}</span>
        <span className="text-[#ccc] flex-1 truncate">{decoded.operands}</span>
        <span className={`text-[#555] text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </div>
      {expanded && (
        <div className="ml-2 mt-1 mb-2 bg-[#0a0a12] border border-[#333] rounded-md p-3 text-xs">
          <div className="mb-2 pb-2 border-b border-[#333]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#888]">Variant:</span>
              <code className="font-mono text-[#e94560] bg-[#1a1a2e] px-1.5 py-0.5 rounded">
                {decoded.variant}
              </code>
            </div>
            <div>
              <span className="text-[#888]">Comment: </span>
              <span className="text-[#ccc]">{decoded.comment}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[#888]">Address: </span>
              <span className="font-mono text-[#4ecca3] select-all">{formatHex(addr)}</span>
            </div>
            <div>
              <span className="text-[#888]">Hex: </span>
              <span className="font-mono text-[#4ecca3] select-all">{formatHex(value)}</span>
            </div>
            <div>
              <span className="text-[#888]">Decimal: </span>
              <span className="font-mono text-[#4ecca3] select-all">{value}</span>
            </div>
            <div>
              <span className="text-[#888]">Signed: </span>
              <span className="font-mono text-[#4ecca3] select-all">{formatSigned(value)}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[#888]">Binary: </span>
            <span className="font-mono text-[#4ecca3] select-all">{formatBinary(value)}</span>
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
      <div className="bg-[#0f0f1a] rounded-md p-2 font-mono text-xs max-h-[350px] overflow-y-auto">
        {rows.length > 0 ? (
          rows
        ) : (
          <div className="text-[#555] italic p-2 text-center">
            Load a program to view memory
          </div>
        )}
      </div>
    </div>
  );
}

export default MemoryViewer;
