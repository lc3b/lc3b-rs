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

function decodeInstruction(word: number): { opcode: string; operands: string; description: string } {
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
  const bit4 = (word >> 4) & 0x1;
  const amount4 = word & 0xf;
  const n = (word >> 11) & 0x1;
  const z = (word >> 10) & 0x1;
  const p = (word >> 9) & 0x1;

  switch (op) {
    case 0b0000: { // BR
      const cond = (n ? "n" : "") + (z ? "z" : "") + (p ? "p" : "");
      return {
        opcode: "BR" + cond,
        operands: `${offset9Signed}`,
        description: `Branch${cond ? ` if ${cond}` : ""} to PC + ${offset9Signed}`,
      };
    }
    case 0b0001: // ADD
      if (bit5) {
        return {
          opcode: "ADD",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          description: `${registerName(dr)} = ${registerName(sr1)} + ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "ADD",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          description: `${registerName(dr)} = ${registerName(sr1)} + ${registerName(sr2)}`,
        };
      }
    case 0b0010: // LDB
      return {
        opcode: "LDB",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        description: `${registerName(dr)} = mem[${registerName(sr1)} + ${offset6Signed}] (byte)`,
      };
    case 0b0011: // STB
      return {
        opcode: "STB",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        description: `mem[${registerName(sr1)} + ${offset6Signed}] = ${registerName(dr)} (byte)`,
      };
    case 0b0100: // JSR/JSRR
      if (bit11) {
        return {
          opcode: "JSR",
          operands: `${offset11Signed}`,
          description: `R7 = PC; PC = PC + ${offset11Signed}`,
        };
      } else {
        return {
          opcode: "JSRR",
          operands: `${registerName(sr1)}`,
          description: `R7 = PC; PC = ${registerName(sr1)}`,
        };
      }
    case 0b0101: // AND
      if (bit5) {
        return {
          opcode: "AND",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          description: `${registerName(dr)} = ${registerName(sr1)} & ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "AND",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          description: `${registerName(dr)} = ${registerName(sr1)} & ${registerName(sr2)}`,
        };
      }
    case 0b0110: // LDW
      return {
        opcode: "LDW",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        description: `${registerName(dr)} = mem[${registerName(sr1)} + ${offset6Signed * 2}] (word)`,
      };
    case 0b0111: // STW
      return {
        opcode: "STW",
        operands: `${registerName(dr)}, ${registerName(sr1)}, #${offset6Signed}`,
        description: `mem[${registerName(sr1)} + ${offset6Signed * 2}] = ${registerName(dr)} (word)`,
      };
    case 0b1000: // RTI
      return {
        opcode: "RTI",
        operands: "",
        description: "Return from interrupt",
      };
    case 0b1001: // XOR/NOT
      if (bit5 && imm5 === 0x1f) {
        return {
          opcode: "NOT",
          operands: `${registerName(dr)}, ${registerName(sr1)}`,
          description: `${registerName(dr)} = ~${registerName(sr1)}`,
        };
      } else if (bit5) {
        return {
          opcode: "XOR",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${imm5Signed}`,
          description: `${registerName(dr)} = ${registerName(sr1)} ^ ${imm5Signed}`,
        };
      } else {
        return {
          opcode: "XOR",
          operands: `${registerName(dr)}, ${registerName(sr1)}, ${registerName(sr2)}`,
          description: `${registerName(dr)} = ${registerName(sr1)} ^ ${registerName(sr2)}`,
        };
      }
    case 0b1100: // JMP/RET
      if (sr1 === 7) {
        return {
          opcode: "RET",
          operands: "",
          description: "Return (PC = R7)",
        };
      } else {
        return {
          opcode: "JMP",
          operands: `${registerName(sr1)}`,
          description: `PC = ${registerName(sr1)}`,
        };
      }
    case 0b1101: // SHF
      const shfType = (word >> 4) & 0x3;
      const shfAmount = word & 0xf;
      if (shfType === 0) {
        return {
          opcode: "LSHF",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          description: `${registerName(dr)} = ${registerName(sr1)} << ${shfAmount}`,
        };
      } else if (shfType === 1) {
        return {
          opcode: "RSHFL",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          description: `${registerName(dr)} = ${registerName(sr1)} >>> ${shfAmount} (logical)`,
        };
      } else {
        return {
          opcode: "RSHFA",
          operands: `${registerName(dr)}, ${registerName(sr1)}, #${shfAmount}`,
          description: `${registerName(dr)} = ${registerName(sr1)} >> ${shfAmount} (arithmetic)`,
        };
      }
    case 0b1110: // LEA
      return {
        opcode: "LEA",
        operands: `${registerName(dr)}, #${offset9Signed}`,
        description: `${registerName(dr)} = PC + ${offset9Signed * 2}`,
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
        operands: trapName,
        description: `Trap ${trapName}`,
      };
    default:
      return {
        opcode: "???",
        operands: "",
        description: "Reserved/Unknown opcode",
      };
  }
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
            <span className="text-[#888]">Description: </span>
            <span className="text-[#ccc]">{decoded.description}</span>
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
