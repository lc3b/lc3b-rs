export interface ProgramCounterProps {
  programCounter: number;
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function ProgramCounter({ programCounter }: ProgramCounterProps) {
  return (
    <div className="mb-8">
      <div className="panel-title">Program Counter</div>
      <div className="bg-[#0f0f1a] rounded-lg p-4 text-center">
        <div className="text-xs text-[#888] mb-1">PC</div>
        <div className="font-mono text-2xl text-[#4ecca3] font-bold">
          {formatHex(programCounter)}
        </div>
      </div>
    </div>
  );
}

export default ProgramCounter;
