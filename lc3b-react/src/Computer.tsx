import { useState, useRef, useEffect } from "react";

import init, { WasmComputer, wasm_memory_size } from "lc3b";

import ProgramCounter from "./ProgramCounter";
import ConditionCodes from "./ConditionCodes";
import RegisterSet from "./RegisterSet";
import MemoryViewer from "./MemoryViewer";
import Console from "./Console";
import About from "./About";
import Instructions from "./Instructions";
import Assembly from "./Assembly";
import { SamplePrograms } from "./SamplePrograms";
import { ThemeToggle } from "./ThemeContext";

const DEFAULT_ASSEMBLY = `; LC-3b Assembly Program
; Example: Add registers

ADD R1, R2, R0   ; R1 = R2 + R0
ADD R3, R1, #5   ; R3 = R1 + 5
ADD R4, R3, R1   ; R4 = R3 + R1
`;

type Tab = "simulator" | "instructions" | "assembly" | "samples" | "about";

function Computer() {
  const [activeTab, setActiveTab] = useState<Tab>("simulator");
  const [assembly, setAssembly] = useState(DEFAULT_ASSEMBLY);
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [programLoaded, setProgramLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [instructionCount, setInstructionCount] = useState(0);
  const [pc, setPc] = useState(0);
  const [conditions, setConditions] = useState({ n: false, z: false, p: false });
  const [registers, setRegisters] = useState({
    r0: 0,
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0,
    r5: 0,
    r6: 0,
    r7: 0,
  });
  const [modifiedRegister, setModifiedRegister] = useState<number | null>(null);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [isHalted, setIsHalted] = useState(false);
  const [wasmMemoryBytes, setWasmMemoryBytes] = useState<number | null>(null);

  const computerRef = useRef<WasmComputer | null>(null);

  useEffect(() => {
    init().then(() => {
      setWasmLoaded(true);
      setWasmMemoryBytes(wasm_memory_size());
    });
  }, []);

  const updateState = () => {
    const computer = computerRef.current;
    if (computer) {
      setPc(computer.program_counter());
      setConditions({
        n: computer.condition_n(),
        z: computer.condition_z(),
        p: computer.condition_p(),
      });
      setRegisters({
        r0: computer.register(0),
        r1: computer.register(1),
        r2: computer.register(2),
        r3: computer.register(3),
        r4: computer.register(4),
        r5: computer.register(5),
        r6: computer.register(6),
        r7: computer.register(7),
      });
      setConsoleOutput(computer.console_output());
      setIsHalted(computer.is_halted());
      setWasmMemoryBytes(wasm_memory_size());
    }
  };

  const handleLoadProgram = () => {
    try {
      const computer = new WasmComputer();
      computer.load_assembly(assembly);
      computerRef.current = computer;
      setLoadError(null);
      setInstructionCount(0);
      setProgramLoaded(true);
      setConsoleOutput("");
      setIsHalted(false);
      updateState();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setProgramLoaded(false);
      computerRef.current = null;
    }
  };

  const handleNextInstruction = () => {
    const computer = computerRef.current;
    if (computer && !computer.is_halted()) {
      computer.next_instruction();
      setInstructionCount((prev) => prev + 1);

      // Get the last modified register before updating state
      const modReg = computer.last_modified_register();
      setModifiedRegister(modReg >= 0 ? modReg : null);

      updateState();
    }
  };

  const handleReadMemory = (addr: number): number => {
    if (computerRef.current) {
      return computerRef.current.read_memory(addr);
    }
    return 0;
  };

  const handleLoadSample = (code: string) => {
    setAssembly(code);
    setProgramLoaded(false);
    setLoadError(null);
    setActiveTab("simulator");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header with dither pattern */}
      <header className="relative bg-[var(--bg-secondary)] px-6 py-4 border-b-2 border-[var(--border-contrast)]">
        <div className="absolute inset-0 dither-pattern opacity-30 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl text-[var(--accent-primary)] font-bold flex items-center gap-3">
              <img src="/favicon.svg" alt="LC-3b" className="w-8 h-8" />
              {wasmLoaded ? "LC-3b Simulator" : <span className="loading">LC-3b (loading...)</span>}
            </h1>
            {wasmMemoryBytes !== null && (
              <span className="text-xs text-[var(--text-muted)] font-mono">
                WASM: {(wasmMemoryBytes / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab("simulator")}
                className={`tab-button px-4 py-2 ${activeTab === "simulator" ? "active" : ""}`}
              >
                Simulator
              </button>
              <button
                onClick={() => setActiveTab("instructions")}
                className={`tab-button px-4 py-2 ${activeTab === "instructions" ? "active" : ""}`}
              >
                Instructions
              </button>
              <button
                onClick={() => setActiveTab("assembly")}
                className={`tab-button px-4 py-2 ${activeTab === "assembly" ? "active" : ""}`}
              >
                Assembly
              </button>
              <button
                onClick={() => setActiveTab("samples")}
                className={`tab-button px-4 py-2 ${activeTab === "samples" ? "active" : ""}`}
              >
                Samples
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`tab-button px-4 py-2 ${activeTab === "about" ? "active" : ""}`}
              >
                About
              </button>
            </nav>
            <div className="border-l border-[var(--border-color)] pl-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {activeTab === "simulator" ? (
        <div className="flex flex-1 h-[calc(100vh-68px)]">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col p-6 bg-[var(--bg-primary)]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                LC-3b Assembly
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`status-dot ${programLoaded ? (isHalted ? "halted" : "ready") : "not-ready"}`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      programLoaded
                        ? isHalted
                          ? "text-[var(--accent-warning)]"
                          : "text-[var(--accent-success)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {programLoaded ? (isHalted ? "Halted" : "Ready") : "Not Loaded"}
                  </span>
                </div>
                {programLoaded && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {instructionCount} instruction{instructionCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <textarea
              className="input-field h-48 min-h-[120px] max-h-[400px] rounded-lg p-4 font-mono text-sm resize-y leading-relaxed"
              value={assembly}
              onChange={(e) => {
                setAssembly(e.target.value);
                setProgramLoaded(false);
                setLoadError(null);
              }}
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleLoadProgram}
                disabled={!wasmLoaded}
                className="btn-primary px-6 py-3 rounded-md"
              >
                Assemble and Load to Memory
              </button>
              <button
                onClick={handleNextInstruction}
                disabled={!programLoaded || isHalted}
                title={!programLoaded ? "No program loaded" : isHalted ? "Program halted" : undefined}
                className="btn-secondary px-6 py-3 rounded-md"
              >
                Execute Next Instruction
              </button>
            </div>
            {loadError && (
              <div className="mt-4 p-4 bg-[var(--accent-error)]/10 border-2 border-[var(--accent-error)] rounded-lg">
                <div className="text-[var(--accent-error)] font-semibold text-sm mb-1">Assembly Error</div>
                <pre className="text-[var(--accent-error)] text-sm font-mono whitespace-pre-wrap opacity-80">{loadError}</pre>
              </div>
            )}
            {/* Console Output */}
            {programLoaded && <Console output={consoleOutput} isHalted={isHalted} />}
          </div>

          {/* Computer Panel */}
          <div className="w-[400px] relative bg-[var(--bg-secondary)] border-l-2 border-[var(--border-contrast)] p-6 overflow-y-auto">
            <div className="absolute inset-0 dither-pattern opacity-20 pointer-events-none" />
            <div className="relative">
              <ProgramCounter programCounter={pc} />
              <ConditionCodes n={conditions.n} z={conditions.z} p={conditions.p} />
              <RegisterSet registers={registers} modifiedRegister={modifiedRegister} />
              {programLoaded && (
                <MemoryViewer programCounter={pc} readMemory={handleReadMemory} />
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "instructions" ? (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          <Instructions />
        </div>
      ) : activeTab === "assembly" ? (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          <Assembly />
        </div>
      ) : activeTab === "samples" ? (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          <SamplePrograms onLoadSample={handleLoadSample} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          <About />
        </div>
      )}
    </div>
  );
}

export default Computer;
