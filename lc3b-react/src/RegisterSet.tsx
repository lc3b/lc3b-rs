export interface RegisterSetProps {
  registers: {
    r0: number;
    r1: number;
    r2: number;
    r3: number;
    r4: number;
    r5: number;
    r6: number;
    r7: number;
  };
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function RegisterSet({ registers }: RegisterSetProps) {
  const regs = [
    { name: "R0", value: registers.r0 },
    { name: "R1", value: registers.r1 },
    { name: "R2", value: registers.r2 },
    { name: "R3", value: registers.r3 },
    { name: "R4", value: registers.r4 },
    { name: "R5", value: registers.r5 },
    { name: "R6", value: registers.r6 },
    { name: "R7", value: registers.r7 },
  ];

  return (
    <div className="mb-4">
      <div className="panel-title">Registers</div>
      <div className="bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg p-2">
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          {regs.map((reg) => (
            <div key={reg.name} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">{reg.name}</span>
              <span className="font-mono text-xs text-[var(--accent-primary)]">{formatHex(reg.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RegisterSet;
