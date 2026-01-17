import { samplePrograms } from "./samples";

interface SampleProgramsProps {
  onLoadSample: (code: string) => void;
}

export function SamplePrograms({ onLoadSample }: SampleProgramsProps) {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-accent-primary mb-6">
          Sample Programs
        </h2>
        <p className="text-text-primary mb-8">
          Click "Try This Program" to load a sample program into the simulator.
        </p>

        <div className="space-y-6">
          {samplePrograms.map((sample, index) => (
            <div
              key={index}
              className="bg-bg-tertiary rounded-lg p-5 border-l-4 border-accent-secondary"
            >
              <h3 className="text-lg font-bold text-accent-primary mb-2">
                {sample.title}
              </h3>
              <p className="text-text-secondary text-sm mb-4">{sample.description}</p>

              <div className="bg-bg-primary rounded-md p-4 mb-4 max-h-48 overflow-y-auto">
                <pre className="font-mono text-sm text-text-primary whitespace-pre">
                  {sample.code}
                </pre>
              </div>

              <button
                onClick={() => onLoadSample(sample.code)}
                className="btn-primary"
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
