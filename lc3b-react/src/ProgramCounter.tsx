export interface ProgramCounterProps {
  programCounter: number;
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function ProgramCounter({ programCounter }: ProgramCounterProps) {
  return (
    <div 
      className="mb-4 bg-[var(--bg-tertiary)] border-2 border-[var(--border-contrast)] p-3 flex items-center justify-between"
      style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
    >
      <span className="text-sm text-[var(--text-muted)] font-semibold uppercase tracking-wider">PC</span>
      <span className="font-mono text-lg text-[var(--accent-primary)] font-bold">
        {formatHex(programCounter)}
      </span>
    </div>
  );
}

export default ProgramCounter;
