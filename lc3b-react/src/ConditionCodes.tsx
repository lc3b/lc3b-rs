export interface ConditionCodesProps {
  n: boolean;
  z: boolean;
  p: boolean;
}

function ConditionCodes({ n, z, p }: ConditionCodesProps) {
  return (
    <div className="mb-6">
      <div className="panel-title">Condition Codes</div>
      <div className="flex gap-2">
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold ${
            n ? "bg-[#e94560] text-white" : "bg-[#0f0f1a] text-[#555]"
          }`}
          title="Negative"
        >
          N
        </div>
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold ${
            z ? "bg-[#4ecca3] text-white" : "bg-[#0f0f1a] text-[#555]"
          }`}
          title="Zero"
        >
          Z
        </div>
        <div
          className={`flex-1 text-center py-2 rounded-md font-mono font-bold ${
            p ? "bg-[#0f3460] text-white" : "bg-[#0f0f1a] text-[#555]"
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
