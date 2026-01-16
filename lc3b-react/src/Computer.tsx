import React, { useState, useRef } from "react";

import init, {
  WasmCallbacksRegistry,
  Computer as WasmComputer,
  new_computer,
  next_instruction,
  program_counter,
} from "lc3b";

import "./App.css";

import ProgramCounter from "./ProgramCounter";
import RegisterSet from "./RegisterSet";

function Computer() {
  const [assembly, setAssembly] = React.useState("ADD R1, R1, 1; neato");

  const computerRef = useRef<WasmComputer | null>(null);
  const [computerWasmIsLoaded, setComputerWasmIsLoaded] = useState(false);
  const [assemblyIsLoaded, setAssemblyIsLoaded] = useState(false);

  const [programCounter, setProgramCounter] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [registers, _setregisters] = useState({
    r0: 0,
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0,
    r5: 0,
    r6: 0,
    r7: 0,
  });

  React.useEffect(() => {
    init().then(() => {
      setComputerWasmIsLoaded(true);
    });
  });

  const handleAssemblySubmit = (
    _args: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    var callbacks = WasmCallbacksRegistry.new(handleComputerEvent);
    computerRef.current = new_computer(assembly, callbacks);
    setAssemblyIsLoaded(true);
  };

  const handleAssemblyTextChange = () => {
    setAssemblyIsLoaded(false);
  };

  const handleNextStep = () => {
    next_instruction(computerRef.current!);
  };

  const handleComputerEvent = () => {
    var pc = program_counter(computerRef.current!);
    setProgramCounter(1);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-gray-800 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">
          LC-3b
          {computerWasmIsLoaded ? (
            <span>LC3-b WASM loaded</span>
          ) : (
            <span>LC3-b WASM is not ready yet</span>
          )}
          {assemblyIsLoaded ? (
            <span>LC3-b assembly loaded</span>
          ) : (
            <span>LC3-b assembly is not ready yet</span>
          )}
        </h1>
      </header>
      <div className="flex flex-1">
        <div className="flex-1 p-4">
          <textarea
            className="w-full h-64 p-2 border border-gray-300 rounded mb-4 resize-y"
            defaultValue={assembly}
            onChange={(e) => {
              setAssembly(e.target.value);
              handleAssemblyTextChange();
            }}
          ></textarea>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleAssemblySubmit}
          >
            Load assembly
          </button>

          <button
            className=" {assemblyIsLoaded ? (bg-green-500) : (hover:bg-gray-700) } hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleNextStep}
            disabled={!assemblyIsLoaded}
          >
            Run next instruction
          </button>
        </div>

        <div className="flex-1 p-4 bg-gray-100">
          <ProgramCounter programCounter={programCounter} />
          <RegisterSet registers={registers} />
        </div>
      </div>
    </div>
  );
}

export default Computer;
