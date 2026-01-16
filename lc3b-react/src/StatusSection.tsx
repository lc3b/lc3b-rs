export interface StatusSectionProps {
  isLoaded: boolean;
  instructionCount: number;
}

function StatusSection({ isLoaded, instructionCount }: StatusSectionProps) {
  return (
    <div className="mb-4">
      <div className="panel-title">Status</div>
      <div className="bg-[#0f0f1a] rounded-md p-3 flex justify-between items-center mb-2">
        <span className="text-xs text-[#888]">Program</span>
        <span
          className={`font-mono text-sm ${isLoaded ? "text-[#4ecca3]" : "text-[#e94560]"}`}
        >
          {isLoaded ? "Ready" : "Not Loaded"}
        </span>
      </div>
      <div className="bg-[#0f0f1a] rounded-md p-3 flex justify-between items-center">
        <span className="text-xs text-[#888]">Instructions</span>
        <span className="font-mono text-sm text-[#e94560]">
          {instructionCount}
        </span>
      </div>
    </div>
  );
}

export default StatusSection;
