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

function formatBinary(value: number): string {
  return value.toString(2).padStart(16, "0");
}

function formatSigned(value: number): string {
  if (value >= 0x8000) {
    return (value - 0x10000).toString();
  }
  return value.toString();
}

interface RegisterProps {
  name: string;
  value: number;
}

function Register({ name, value }: RegisterProps) {
  return (
    <div className="register bg-[#0f0f1a] rounded-md p-3 flex justify-between items-center relative cursor-pointer hover:bg-[#141424]">
      <span className="text-sm text-[#888] font-semibold">{name}</span>
      <span className="font-mono text-sm text-[#4ecca3]">{formatHex(value)}</span>
      <div className="register-tooltip">
        <div className="flex justify-between gap-4 py-0.5 text-xs">
          <span className="text-[#888]">Hex</span>
          <span className="font-mono text-[#4ecca3]">{formatHex(value)}</span>
        </div>
        <div className="flex justify-between gap-4 py-0.5 text-xs">
          <span className="text-[#888]">Decimal</span>
          <span className="font-mono text-[#4ecca3]">{value}</span>
        </div>
        <div className="flex justify-between gap-4 py-0.5 text-xs">
          <span className="text-[#888]">Signed</span>
          <span className="font-mono text-[#4ecca3]">{formatSigned(value)}</span>
        </div>
        <div className="flex justify-between gap-4 py-0.5 text-xs">
          <span className="text-[#888]">Binary</span>
          <span className="font-mono text-[#4ecca3]">{formatBinary(value)}</span>
        </div>
      </div>
    </div>
  );
}

function RegisterSet({ registers }: RegisterSetProps) {
  return (
    <div className="mb-8">
      <div className="panel-title">Registers</div>
      <div className="grid grid-cols-2 gap-2">
        <Register name="R0" value={registers.r0} />
        <Register name="R1" value={registers.r1} />
        <Register name="R2" value={registers.r2} />
        <Register name="R3" value={registers.r3} />
        <Register name="R4" value={registers.r4} />
        <Register name="R5" value={registers.r5} />
        <Register name="R6" value={registers.r6} />
        <Register name="R7" value={registers.r7} />
      </div>
    </div>
  );
}

export default RegisterSet;
