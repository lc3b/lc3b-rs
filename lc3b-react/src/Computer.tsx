import { useState, useRef, useEffect } from "react";

import init, { WasmComputer, wasm_memory_size, compile_c_to_assembly, get_available_headers, get_header_contents } from "lc3b";

import ProgramCounter from "./ProgramCounter";
import ConditionCodes from "./ConditionCodes";
import RegisterSet from "./RegisterSet";
import MemoryViewer from "./MemoryViewer";
import Console from "./Console";
import About, { AboutTab } from "./About";
import Instructions from "./Instructions";
import Assembly from "./Assembly";
import { SamplePrograms } from "./SamplePrograms";
import { ThemeToggle } from "./ThemeContext";
import Agent from "./Agent";
import { useAgent } from "./AgentContext";

const DEFAULT_ASSEMBLY = `.ORIG x3000

; LC-3b Assembly Program
; Example: Add registers

ADD R1, R2, R0   ; R1 = R2 + R0
ADD R3, R1, #5   ; R3 = R1 + 5
ADD R4, R3, R1   ; R4 = R3 + R1

HALT
.END
`;

const DEFAULT_C_CODE = `#include <lc3b-io.h>

// Hello World in C for LC-3b

int main() {
    puts("Hello, LC-3b!");
    return 0;
}
`;

type Tab = "simulator" | "instructions" | "assembly" | "samples" | "about" | "agent";
type EditorMode = "assembly" | "c";
type ExamplesSubtab = "assembly" | "c";

// Parse the URL hash to get tab and subtabs
function parseHash(): { tab: Tab; examplesSubtab: ExamplesSubtab; aboutSubtab: AboutTab } {
  const hash = window.location.hash.slice(1); // Remove leading #
  const parts = hash.split("/");
  
  const validTabs: Tab[] = ["simulator", "instructions", "assembly", "samples", "about", "agent"];
  // Map "examples" to "samples" for internal state
  let tab: Tab = "simulator";
  if (parts[0] === "examples") {
    tab = "samples";
  } else if (validTabs.includes(parts[0] as Tab)) {
    tab = parts[0] as Tab;
  }
  
  let examplesSubtab: ExamplesSubtab = "assembly";
  if (parts[0] === "examples" && (parts[1] === "assembly" || parts[1] === "c")) {
    examplesSubtab = parts[1];
  }

  const validAboutSubtabs: AboutTab[] = ["what", "how", "architecture", "contributing"];
  let aboutSubtab: AboutTab = "what";
  if (parts[0] === "about" && validAboutSubtabs.includes(parts[1] as AboutTab)) {
    aboutSubtab = parts[1] as AboutTab;
  }
  
  return { tab, examplesSubtab, aboutSubtab };
}

// Build a hash string from tab and subtab
function buildHash(tab: Tab, examplesSubtab?: ExamplesSubtab, aboutSubtab?: AboutTab): string {
  // Use "examples" in URL instead of "samples"
  const urlTab = tab === "samples" ? "examples" : tab;
  if (tab === "samples" && examplesSubtab) {
    return `#${urlTab}/${examplesSubtab}`;
  }
  if (tab === "about" && aboutSubtab && aboutSubtab !== "what") {
    return `#${urlTab}/${aboutSubtab}`;
  }
  return `#${urlTab}`;
}

function Computer() {
  const { tab: initialTab, examplesSubtab: initialExamplesSubtab, aboutSubtab: initialAboutSubtab } = parseHash();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [examplesSubtab, setExamplesSubtab] = useState<ExamplesSubtab>(initialExamplesSubtab);
  const [aboutSubtab, setAboutSubtab] = useState<AboutTab>(initialAboutSubtab);
  const [editorMode, setEditorMode] = useState<EditorMode>("assembly");
  const [assembly, setAssembly] = useState(DEFAULT_ASSEMBLY);
  const [cCode, setCCode] = useState(DEFAULT_C_CODE);
  
  // Agent integration
  const { status: agentStatus, setLC3BState } = useAgent();
  const [compileError, setCompileError] = useState<string | null>(null);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [expandedHeader, setExpandedHeader] = useState<string | null>(null);
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

  // Update URL when tab or subtab changes
  useEffect(() => {
    const newHash = buildHash(
      activeTab,
      activeTab === "samples" ? examplesSubtab : undefined,
      activeTab === "about" ? aboutSubtab : undefined
    );
    if (window.location.hash !== newHash) {
      window.history.pushState(null, "", newHash);
    }
  }, [activeTab, examplesSubtab, aboutSubtab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const { tab, examplesSubtab: subtab, aboutSubtab: aboutSub } = parseHash();
      setActiveTab(tab);
      setExamplesSubtab(subtab);
      setAboutSubtab(aboutSub);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    init().then(() => {
      setWasmLoaded(true);
      setWasmMemoryBytes(wasm_memory_size());
      setAvailableHeaders(get_available_headers());
    });
  }, []);

  const updateState = () => {
    const computer = computerRef.current;
    if (computer) {
      const newPc = computer.program_counter();
      const newConditions = {
        n: computer.condition_n(),
        z: computer.condition_z(),
        p: computer.condition_p(),
      };
      const newRegisters = {
        r0: computer.register(0),
        r1: computer.register(1),
        r2: computer.register(2),
        r3: computer.register(3),
        r4: computer.register(4),
        r5: computer.register(5),
        r6: computer.register(6),
        r7: computer.register(7),
      };
      const newConsoleOutput = computer.console_output();
      const newIsHalted = computer.is_halted();
      
      setPc(newPc);
      setConditions(newConditions);
      setRegisters(newRegisters);
      setConsoleOutput(newConsoleOutput);
      setIsHalted(newIsHalted);
      setWasmMemoryBytes(wasm_memory_size());
      
      // Update agent with LC-3B state
      setLC3BState({
        cCode,
        assembly,
        registers: newRegisters,
        pc: newPc,
        conditions: newConditions,
        isHalted: newIsHalted,
        consoleOutput: newConsoleOutput,
      });
    }
  };
  
  // Keep agent updated with code changes
  useEffect(() => {
    setLC3BState({
      cCode,
      assembly,
      registers,
      pc,
      conditions,
      isHalted,
      consoleOutput,
    });
  }, [cCode, assembly, registers, pc, conditions, isHalted, consoleOutput, setLC3BState]);

  const handleCompileC = () => {
    try {
      const compiledAssembly = compile_c_to_assembly(cCode);
      setAssembly(compiledAssembly);
      setCompileError(null);
      setEditorMode("assembly");
      setProgramLoaded(false);
      setLoadError(null);
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : String(e));
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

  const handleLoadSample = (code: string, mode: "assembly" | "c") => {
    if (mode === "c") {
      setCCode(code);
      setEditorMode("c");
      setCompileError(null);
    } else {
      setAssembly(code);
      setEditorMode("assembly");
    }
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
                Examples
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`tab-button px-4 py-2 ${activeTab === "about" ? "active" : ""}`}
              >
                About
              </button>
            </nav>
            <div className="border-l border-[var(--border-color)] pl-4 flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setActiveTab("agent")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "agent"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>Agent</span>
                <AgentStatusIndicator status={agentStatus} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Simulator Tab */}
      <div className={`flex flex-1 h-[calc(100vh-68px)] ${activeTab === "simulator" ? "" : "hidden"}`}>
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col p-6 bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between mb-3">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <div 
                className="flex border-2 border-[var(--border-color)]"
                style={{ boxShadow: '2px 2px 0 var(--shadow-color)' }}
              >
                <button
                  onClick={() => setEditorMode("c")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    editorMode === "c"
                      ? "bg-[var(--accent-primary)] text-[var(--bg-primary)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  C
                </button>
                <button
                  onClick={() => setEditorMode("assembly")}
                  className={`px-3 py-1 text-sm font-medium transition-colors border-l-2 border-[var(--border-color)] ${
                    editorMode === "assembly"
                      ? "bg-[var(--accent-primary)] text-[var(--bg-primary)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Assembly
                </button>
              </div>
              <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-semibold ml-2">
                {editorMode === "c" ? "C Source" : "LC-3b Assembly"}
              </span>
            </div>
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

          {/* Editor textarea - shows C or Assembly based on mode */}
          {editorMode === "c" ? (
            <textarea
              className="input-field h-48 min-h-[120px] max-h-[400px] rounded-lg p-4 font-mono text-sm resize-y leading-relaxed"
              value={cCode}
              onChange={(e) => {
                setCCode(e.target.value);
                setCompileError(null);
              }}
              placeholder="Enter C code here..."
            />
          ) : (
            <textarea
              className="input-field h-48 min-h-[120px] max-h-[400px] rounded-lg p-4 font-mono text-sm resize-y leading-relaxed"
              value={assembly}
              onChange={(e) => {
                setAssembly(e.target.value);
                setProgramLoaded(false);
                setLoadError(null);
              }}
              placeholder="Enter LC-3b assembly here..."
            />
          )}

          {/* Available Headers - only show in C mode */}
          {editorMode === "c" && availableHeaders.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">
                Available Headers
              </div>
              <div className="space-y-2">
                {availableHeaders.map((header) => (
                  <div key={header} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedHeader(expandedHeader === header ? null : header)}
                      className="w-full px-3 py-2 text-left text-sm font-mono bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between"
                    >
                      <span className="text-[var(--accent-primary)]">&lt;{header}&gt;</span>
                      <span className="text-[var(--text-muted)]">
                        {expandedHeader === header ? "▼" : "▶"}
                      </span>
                    </button>
                    {expandedHeader === header && (
                      <pre className="p-3 text-xs font-mono bg-[var(--bg-primary)] text-[var(--text-secondary)] overflow-x-auto max-h-64 overflow-y-auto">
                        {get_header_contents(header) || "// Header not found"}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 mt-4">
            {editorMode === "c" ? (
              <button
                onClick={handleCompileC}
                disabled={!wasmLoaded}
                className="btn-primary px-6 py-3 rounded-md"
              >
                Compile to Assembly →
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Error displays */}
          {compileError && editorMode === "c" && (
            <div className="mt-4 p-4 bg-[var(--accent-error)]/10 border-2 border-[var(--accent-error)] rounded-lg">
              <div className="text-[var(--accent-error)] font-semibold text-sm mb-1">Compile Error</div>
              <pre className="text-[var(--accent-error)] text-sm font-mono whitespace-pre-wrap opacity-80">{compileError}</pre>
            </div>
          )}
          {loadError && editorMode === "assembly" && (
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

      {/* Instructions Tab */}
      <div className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] ${activeTab === "instructions" ? "" : "hidden"}`}>
        <Instructions />
      </div>

      {/* Assembly Tab */}
      <div className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] ${activeTab === "assembly" ? "" : "hidden"}`}>
        <Assembly />
      </div>

      {/* Samples Tab */}
      <div className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] ${activeTab === "samples" ? "" : "hidden"}`}>
        <SamplePrograms 
          onLoadSample={handleLoadSample}
          activeSubtab={examplesSubtab}
          onSubtabChange={setExamplesSubtab}
        />
      </div>

      {/* Agent Tab */}
      <div className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] ${activeTab === "agent" ? "" : "hidden"}`}>
        <Agent />
      </div>

      {/* About Tab */}
      <div className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] ${activeTab === "about" ? "" : "hidden"}`}>
        <About activeTab={aboutSubtab} onTabChange={setAboutSubtab} />
      </div>
    </div>
  );
}

// Agent status indicator component
function AgentStatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; pulse: boolean }> = {
    disabled: { color: "bg-[var(--text-muted)]", pulse: false },
    downloading: { color: "bg-[var(--accent-primary)]", pulse: true },
    available: { color: "bg-[var(--accent-success)]", pulse: false },
    running: { color: "bg-[var(--accent-quaternary)]", pulse: true },
  };

  const { color, pulse } = config[status] || config.disabled;

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

export default Computer;
