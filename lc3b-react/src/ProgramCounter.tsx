export interface ProgramCounterProps {
  programCounter: number;
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function ProgramCounter({ programCounter }: ProgramCounterProps) {
  return (
    <div className="mb-6 bg-[#0f0f1a] rounded-md p-3 flex items-center justify-between">
      <span className="text-sm text-[#888] font-semibold">PC</span>
      <span className="font-mono text-lg text-[#4ecca3] font-bold">
        {formatHex(programCounter)}
      </span>
    </div>
  );
}

export default ProgramCounter;
