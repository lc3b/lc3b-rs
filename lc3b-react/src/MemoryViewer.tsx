export interface MemoryViewerProps {
  programCounter: number;
  readMemory: (addr: number) => number;
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function decodeInstruction(word: number): string {
  const opcode = (word >> 12) & 0xf;
  const opcodeNames = [
    "BR",
    "ADD",
    "LDB",
    "STB",
    "JSR",
    "AND",
    "LDW",
    "STW",
    "RTI",
    "XOR",
    "???",
    "???",
    "JMP",
    "SHF",
    "LEA",
    "TRAP",
  ];
  return opcodeNames[opcode];
}

function MemoryViewer({ programCounter, readMemory }: MemoryViewerProps) {
  // Show 16 words centered on PC (PC-8 to PC+7)
  const startAddr = Math.max(0, programCounter - 8);
  const endAddr = Math.min(0xffff, startAddr + 15);

  const rows = [];
  for (let addr = startAddr; addr <= endAddr; addr++) {
    const value = readMemory(addr);
    const isPC = addr === programCounter;
    const decoded = decodeInstruction(value);

    rows.push(
      <div
        key={addr}
        className={`memory-row ${isPC ? "memory-row-pc" : ""}`}
      >
        <span className="text-[#888] min-w-[50px]">{formatHex(addr)}</span>
        <span className="font-mono text-[#4ecca3] min-w-[50px]">
          {formatHex(value)}
        </span>
        <span className="text-[#e94560] flex-1">{decoded}</span>
      </div>
    );
  }

  return (
    <div className="mt-8 mb-4">
      <div className="panel-title">Memory</div>
      <div className="bg-[#0f0f1a] rounded-md p-2 font-mono text-xs max-h-[300px] overflow-y-auto">
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
