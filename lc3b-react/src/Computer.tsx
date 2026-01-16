import { useState, useRef, useEffect } from "react";

import init, {
  WasmCallbacksRegistry,
  Computer as WasmComputer,
  new_computer,
  next_instruction,
  program_counter,
  register0,
  register1,
  register2,
  register3,
  register4,
  register5,
  register6,
  register7,
  read_memory,
} from "lc3b";

import ProgramCounter from "./ProgramCounter";
import RegisterSet from "./RegisterSet";
import MemoryViewer from "./MemoryViewer";
import StatusSection from "./StatusSection";
import DebugLog from "./DebugLog";

const DEFAULT_ASSEMBLY = `; LC-3b Assembly Program
; Example: Add registers

ADD R1, R2, R0   ; R1 = R2 + R0
ADD R3, R1, #5   ; R3 = R1 + 5
ADD R4, R3, R1   ; R4 = R3 + R1
`;

function Computer() {
  const [assembly, setAssembly] = useState(DEFAULT_ASSEMBLY);
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [programLoaded, setProgramLoaded] = useState(false);
  const [instructionCount, setInstructionCount] = useState(0);
  const [pc, setPc] = useState(0);
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

  const computerRef = useRef<WasmComputer | null>(null);

  useEffect(() => {
    init().then(() => {
      setWasmLoaded(true);
    });
  }, []);

  const updateState = () => {
    if (computerRef.current) {
      setPc(program_counter(computerRef.current));
      setRegisters({
        r0: register0(computerRef.current),
        r1: register1(computerRef.current),
        r2: register2(computerRef.current),
        r3: register3(computerRef.current),
        r4: register4(computerRef.current),
        r5: register5(computerRef.current),
        r6: register6(computerRef.current),
        r7: register7(computerRef.current),
      });
    }
  };

  const handleLoadProgram = () => {
    // Callback must not access computer while it's borrowed by next_instruction
    const callbacks = WasmCallbacksRegistry.new(() => {});
    computerRef.current = new_computer(assembly, callbacks);
    setInstructionCount(0);
    setProgramLoaded(true);
    updateState();
  };

  const handleNextInstruction = () => {
    if (computerRef.current) {
      next_instruction(computerRef.current);
      setInstructionCount((prev) => prev + 1);
      updateState();
    }
  };

  const handleReadMemory = (addr: number): number => {
    if (computerRef.current) {
      return read_memory(computerRef.current, addr);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <header className="bg-[#16213e] p-4 border-b-2 border-[#0f3460]">
        <h1 className="text-2xl text-[#e94560]">
          {wasmLoaded ? "LC-3b Simulator" : <span className="loading">LC-3b (loading...)</span>}
        </h1>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col p-6 bg-[#1a1a2e]">
          <label className="text-sm text-[#888] mb-2 uppercase tracking-wide">
            LC-3b Assembly
          </label>
          <textarea
            className="flex-1 bg-[#0f0f1a] border border-[#333] rounded-lg p-4 font-mono text-sm text-[#e0e0e0] resize-none leading-relaxed focus:outline-none focus:border-[#e94560] focus:ring-2 focus:ring-[#e94560]/20"
            value={assembly}
            onChange={(e) => {
              setAssembly(e.target.value);
              setProgramLoaded(false);
            }}
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleLoadProgram}
              disabled={!wasmLoaded}
              className="px-6 py-3 bg-[#e94560] text-white font-semibold rounded-md hover:bg-[#d63850] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Program
            </button>
            <button
              onClick={handleNextInstruction}
              disabled={!programLoaded}
              className="px-6 py-3 bg-[#0f3460] text-white font-semibold rounded-md hover:bg-[#1a4a7a] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute Next Instruction
            </button>
          </div>
        </div>

        {/* Computer Panel */}
        <div className="w-80 bg-[#16213e] border-l-2 border-[#0f3460] p-6 overflow-y-auto">
          <ProgramCounter programCounter={pc} />
          <RegisterSet registers={registers} />
          <StatusSection isLoaded={programLoaded} instructionCount={instructionCount} />
          {programLoaded && (
            <MemoryViewer programCounter={pc} readMemory={handleReadMemory} />
          )}
          <DebugLog />
        </div>
      </div>
    </div>
  );
}

export default Computer;
