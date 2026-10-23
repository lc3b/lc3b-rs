import { useState } from "react";
import { BitExplorer, formatHex } from "./BitExplorer";

export interface MemoryViewerProps {
  programCounter: number;
  readMemory: (addr: number) => number;
}

const WORDS_PER_PAGE = 16;

function registerName(index: number): string {
  return `R${index & 0x7}`;
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
      const brName = cond ? `BR${cond}` : "BRnzp";
      return {
        opcode: brName,
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

interface MemoryRowProps {
  addr: number;
  value: number;
  isPC: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function MemoryRow({ addr, value, isPC, isSelected, onSelect }: MemoryRowProps) {
  const decoded = decodeInstruction(value);

  return (
    <div
      onClick={onSelect}
      className={`flex gap-3 px-2 py-1 cursor-pointer select-none ${
        isSelected
          ? "bg-accent-primary/20 border-l-[3px] border-accent-secondary"
          : isPC
            ? "bg-bg-highlight border-l-[3px] border-accent-primary"
            : "hover:bg-bg-secondary border-l-[3px] border-transparent"
      }`}
    >
      <span className="text-text-muted min-w-[50px]">{formatHex(addr)}</span>
      <span className="font-mono text-accent-secondary min-w-[50px]">{formatHex(value)}</span>
      <span className="text-accent-primary font-semibold min-w-[45px]">{decoded.opcode}</span>
      <span className="text-text-primary flex-1 truncate">{decoded.operands}</span>
    </div>
  );
}

function MemoryViewer({ programCounter, readMemory }: MemoryViewerProps) {
  const [pageOffset, setPageOffset] = useState(0);
  const [selectedAddr, setSelectedAddr] = useState<number | null>(null);

  // Calculate base address from PC, then apply page offset
  const baseAddr = Math.max(0, programCounter - 8);
  const startAddr = Math.max(0, baseAddr + pageOffset * WORDS_PER_PAGE);
  const endAddr = Math.min(0xffff, startAddr + WORDS_PER_PAGE - 1);

  const canGoBack = startAddr > 0;
  const canGoForward = endAddr < 0xffff;

  const handlePageBack = () => {
    if (canGoBack) {
      setPageOffset(pageOffset - 1);
    }
  };

  const handlePageForward = () => {
    if (canGoForward) {
      setPageOffset(pageOffset + 1);
    }
  };

  const handleResetToPC = () => {
    setPageOffset(0);
  };

  const handleSelectRow = (addr: number) => {
    setSelectedAddr(selectedAddr === addr ? null : addr);
  };

  const rows = [];
  for (let addr = startAddr; addr <= endAddr; addr++) {
    const value = readMemory(addr);
    rows.push(
      <MemoryRow
        key={addr}
        addr={addr}
        value={value}
        isPC={addr === programCounter}
        isSelected={addr === selectedAddr}
        onSelect={() => handleSelectRow(addr)}
      />
    );
  }

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="panel-title mb-0">Memory</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePageBack}
            disabled={!canGoBack}
            className={`px-2 py-0.5 text-xs border border-border-color ${
              canGoBack 
                ? "hover:bg-bg-secondary cursor-pointer" 
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            ◀ Back
          </button>
          {pageOffset !== 0 && (
            <button
              onClick={handleResetToPC}
              className="px-2 py-0.5 text-xs border border-border-color hover:bg-bg-secondary cursor-pointer text-accent-primary"
            >
              ⌖ PC
            </button>
          )}
          <button
            onClick={handlePageForward}
            disabled={!canGoForward}
            className={`px-2 py-0.5 text-xs border border-border-color ${
              canGoForward 
                ? "hover:bg-bg-secondary cursor-pointer" 
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            Next ▶
          </button>
        </div>
      </div>
      <div 
        className="bg-bg-primary border-2 border-border-color p-2 font-mono text-xs"
        style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
      >
        {rows.length > 0 ? (
          rows
        ) : (
          <div className="text-text-muted italic p-2 text-center">
            Load a program to view memory
          </div>
        )}
      </div>
      {selectedAddr !== null && (
        <div className="mt-2">
          <BitExplorer
            label={`Address: ${formatHex(selectedAddr)}`}
            word={readMemory(selectedAddr)}
            onClose={() => setSelectedAddr(null)}
            mode="instruction"
          />
        </div>
      )}
    </div>
  );
}

export default MemoryViewer;
