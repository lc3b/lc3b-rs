import { assemblyExamples, cExamples, SampleProgram } from "./samples";

type ExampleTab = "assembly" | "c";

interface SampleProgramsProps {
  onLoadSample: (code: string, mode: "assembly" | "c") => void;
  activeSubtab: ExampleTab;
  onSubtabChange: (subtab: ExampleTab) => void;
}

export function SamplePrograms({ onLoadSample, activeSubtab, onSubtabChange }: SampleProgramsProps) {
  const examples: SampleProgram[] = activeSubtab === "assembly" ? assemblyExamples : cExamples;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-accent-primary mb-6">
          Examples
        </h2>
        <p className="text-text-primary mb-6">
          Click "Load Example" to load a program into the simulator.
        </p>

        {/* Subtabs for Assembly / C */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => onSubtabChange("assembly")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeSubtab === "assembly"
                ? "bg-[var(--accent-primary)] text-[var(--bg-primary)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Assembly
          </button>
          <button
            onClick={() => onSubtabChange("c")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeSubtab === "c"
                ? "bg-[var(--accent-primary)] text-[var(--bg-primary)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            C
          </button>
        </div>

        <div className="space-y-6">
          {examples.map((sample, index) => (
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
                onClick={() => onLoadSample(sample.code, activeSubtab)}
                className="btn-primary px-5 py-2.5"
              >
                Load example
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
