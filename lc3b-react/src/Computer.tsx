import React, { useRef } from "react";

import { Computer as WasmComputer, new_computer } from "lc3b";

import "./App.css";

// import new_computer from "lc3b";

function Computer() {
  const [assembly, setAssembly] = React.useState("ADD R1, R1, 100; neato");

  const computerRef = useRef<WasmComputer | null>(null);

  return (
    <div className="flex flex-col h-full">
      <header className="bg-gray-800 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">LC-3b</h1>
      </header>
      <div className="flex flex-1">
        <div className="flex-1 p-4">
          <textarea
            className="w-full h-64 p-2 border border-gray-300 rounded mb-4 resize-y"
            defaultValue={assembly}
          ></textarea>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setAssembly(assembly)}
          >
            Do something
          </button>
        </div>

        <div className="flex-1 p-4 bg-gray-100">
          <p>Right side content will go here</p>
        </div>
      </div>
    </div>
  );
}

export default Computer;
