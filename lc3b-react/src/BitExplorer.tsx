function formatHex(value: number, digits: number = 4): string {
  return "0x" + value.toString(16).toUpperCase().padStart(digits, "0");
}

function formatBinary(value: number): string {
  return value.toString(2).padStart(16, "0");
}

interface BinarySegment {
  bits: string;
  label: string;
  colorClass: string;
}

function getDataBreakdown(word: number): BinarySegment[] {
  const binary = formatBinary(word);
  // For data values, show nibbles
  return [
    { bits: binary.slice(0, 4), label: "[15:12]", colorClass: "text-accent-primary" },
    { bits: binary.slice(4, 8), label: "[11:8]", colorClass: "text-accent-secondary" },
    { bits: binary.slice(8, 12), label: "[7:4]", colorClass: "text-accent-tertiary" },
    { bits: binary.slice(12, 16), label: "[3:0]", colorClass: "text-accent-quaternary" },
  ];
}

function getInstructionBreakdown(word: number): BinarySegment[] {
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

export interface BitExplorerProps {
  label: string;
  word: number;
  onClose?: () => void;
  mode?: "instruction" | "data";
}

export function BitExplorer({ label, word, onClose, mode = "instruction" }: BitExplorerProps) {
  const segments = mode === "instruction" ? getInstructionBreakdown(word) : getDataBreakdown(word);
  const binary = formatBinary(word);
  const signed = word >= 0x8000 ? word - 0x10000 : word;

  return (
    <div 
      className="bg-bg-primary border-2 border-accent-primary p-4"
      style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-border-color">
        <span className="text-accent-primary font-semibold">Bit Explorer</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary px-2"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mb-3 text-xs text-text-muted">
        {label}
      </div>

      {/* Binary with bit field breakdown */}
      <div className="mb-4">
        <div className="text-text-muted text-xs mb-2">Binary (by field):</div>
        <div className="flex font-mono text-sm gap-1 flex-wrap">
          {segments.map((seg, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`${seg.colorClass} px-1 bg-bg-secondary border border-border-color`}>
                {seg.bits}
              </span>
              <span className="text-[9px] text-text-muted mt-0.5">
                {seg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full binary with bit positions */}
      <div className="mb-4">
        <div className="text-text-muted text-xs mb-1">Binary (full):</div>
        <div className="font-mono text-sm">
          <div className="text-accent-secondary select-all tracking-wider">{binary}</div>
          <div className="text-[9px] text-text-muted tracking-wider">
            {Array.from({ length: 16 }, (_, i) => (15 - i).toString(16).toUpperCase()).join('')}
          </div>
        </div>
      </div>

      {/* Numeric representations */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-bg-secondary p-2 border border-border-color">
          <div className="text-text-muted mb-1">Hex</div>
          <div className="font-mono text-accent-secondary text-sm select-all">{formatHex(word)}</div>
        </div>
        <div className="bg-bg-secondary p-2 border border-border-color">
          <div className="text-text-muted mb-1">Unsigned</div>
          <div className="font-mono text-accent-secondary text-sm select-all">{word}</div>
        </div>
        <div className="bg-bg-secondary p-2 border border-border-color">
          <div className="text-text-muted mb-1">Signed</div>
          <div className="font-mono text-accent-secondary text-sm select-all">{signed}</div>
        </div>
      </div>
    </div>
  );
}

// Also export the instruction breakdown for use in MemoryViewer's instruction decoding
export { getInstructionBreakdown, getDataBreakdown, formatHex, formatBinary };
export type { BinarySegment };
