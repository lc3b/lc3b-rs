interface ConsoleProps {
  output: string;
  isHalted: boolean;
}

function Console({ output, isHalted }: ConsoleProps) {
  const hasOutput = output.length > 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-semibold">
          Console Output
        </label>
        {isHalted && (
          <span className="text-xs text-[var(--accent-warning)] font-medium">
            [HALTED]
          </span>
        )}
      </div>
      <div className="bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg p-4 font-mono text-sm min-h-[80px] max-h-[200px] overflow-y-auto">
        {hasOutput ? (
          <pre className="text-[var(--text-primary)] whitespace-pre-wrap break-all m-0">
            {output}
          </pre>
        ) : (
          <span className="text-[var(--text-muted)] italic">
            No output yet. Use TRAP x21 (OUT) or TRAP x22 (PUTS) to write to console.
          </span>
        )}
      </div>
    </div>
  );
}

export default Console;
