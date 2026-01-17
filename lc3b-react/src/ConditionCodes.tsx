export interface ConditionCodesProps {
  n: boolean;
  z: boolean;
  p: boolean;
}

function ConditionCodes({ n, z, p }: ConditionCodesProps) {
  return (
    <div className="mb-4">
      <div className="panel-title">Condition Codes</div>
      <div className="flex gap-2">
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold border-2 transition-all ${
            n 
              ? "bg-[var(--accent-error)] text-white border-[var(--accent-error)]" 
              : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]"
          }`}
          title="Negative"
        >
          N
        </div>
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold border-2 transition-all ${
            z 
              ? "bg-[var(--accent-success)] text-white border-[var(--accent-success)]" 
              : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]"
          }`}
          title="Zero"
        >
          Z
        </div>
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold border-2 transition-all ${
            p 
              ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]" 
              : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]"
          }`}
          title="Positive"
        >
          P
        </div>
      </div>
    </div>
  );
}

export default ConditionCodes;
