import { useState, useEffect, useRef } from "react";

export interface DebugLogProps {
  // Optional: external log entries can be passed in
  externalEntries?: string[];
}

function DebugLog({ externalEntries = [] }: DebugLogProps) {
  const [entries, setEntries] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Intercept console.log
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
      setEntries((prev) => [...prev, message]);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  // Merge external entries
  const allEntries = [...entries, ...externalEntries];

  const clearLog = () => {
    setEntries([]);
  };

  return (
    <details className="mt-8" open={isOpen} onToggle={() => setIsOpen(!isOpen)}>
      <summary className="panel-title debug-toggle cursor-pointer select-none">
        Emulator Debug Log
      </summary>
      <div
        ref={logRef}
        className="bg-bg-primary rounded-md p-3 font-mono text-xs text-text-muted max-h-[200px] overflow-y-auto mb-2"
      >
        {allEntries.length === 0 ? (
          <div className="text-text-muted italic">No log messages yet.</div>
        ) : (
          allEntries.map((entry, index) => (
            <div
              key={index}
              className="py-1 border-b border-bg-secondary last:border-b-0 break-all"
            >
              {entry}
            </div>
          ))
        )}
      </div>
      <button
        onClick={clearLog}
        className="btn-secondary"
      >
        Clear
      </button>
    </details>
  );
}

export default DebugLog;
