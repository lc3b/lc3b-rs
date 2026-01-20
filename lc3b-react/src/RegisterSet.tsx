import { useEffect, useState } from "react";

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
  modifiedRegister: number | null;
}

function formatHex(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(4, "0");
}

function RegisterSet({ registers, modifiedRegister }: RegisterSetProps) {
  const [animatingReg, setAnimatingReg] = useState<number | null>(null);

  const regs = [
    { name: "R0", value: registers.r0, index: 0 },
    { name: "R1", value: registers.r1, index: 1 },
    { name: "R2", value: registers.r2, index: 2 },
    { name: "R3", value: registers.r3, index: 3 },
    { name: "R4", value: registers.r4, index: 4 },
    { name: "R5", value: registers.r5, index: 5 },
    { name: "R6", value: registers.r6, index: 6 },
    { name: "R7", value: registers.r7, index: 7 },
  ];

  useEffect(() => {
    if (modifiedRegister !== null) {
      setAnimatingReg(modifiedRegister);
      
      // Clear the animation after it completes
      const timer = setTimeout(() => {
        setAnimatingReg(null);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [modifiedRegister, registers]);

  return (
    <div className="mb-4">
      <div className="panel-title">Registers</div>
      <div 
        className="bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] p-2"
        style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
      >
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          {regs.map((reg) => (
            <div
              key={reg.name}
              className={`flex items-center justify-between px-1 transition-colors duration-500 ${
                animatingReg === reg.index ? "register-changed" : ""
              }`}
            >
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
