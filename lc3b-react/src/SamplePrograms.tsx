import { samplePrograms } from "./samples";

interface SampleProgramsProps {
  onLoadSample: (code: string) => void;
}

export function SamplePrograms({ onLoadSample }: SampleProgramsProps) {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[#e94560] mb-6">
          Sample Programs
        </h2>
        <p className="text-[#ccc] mb-8">
          Click "Try This Program" to load a sample program into the simulator.
        </p>

        <div className="space-y-6">
          {samplePrograms.map((sample, index) => (
            <div
              key={index}
              className="bg-[#16213e] rounded-lg p-5 border-l-4 border-[#4ecca3]"
            >
              <h3 className="text-lg font-bold text-[#e94560] mb-2">
                {sample.title}
              </h3>
              <p className="text-[#aaa] text-sm mb-4">{sample.description}</p>

              <div className="bg-[#0f0f1a] rounded-md p-4 mb-4 max-h-48 overflow-y-auto">
                <pre className="font-mono text-sm text-[#e0e0e0] whitespace-pre">
                  {sample.code}
                </pre>
              </div>

              <button
                onClick={() => onLoadSample(sample.code)}
                className="px-4 py-2 bg-[#e94560] hover:bg-[#d63850] text-white rounded-md font-medium transition-all hover:-translate-y-px"
              >
                Try this program
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
