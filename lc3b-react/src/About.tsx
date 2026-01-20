import { useState } from "react";

type AboutTab = "what" | "how" | "architecture" | "contributing";

function About() {
  const [activeTab, setActiveTab] = useState<AboutTab>("what");

  const tabs: { id: AboutTab; label: string }[] = [
    { id: "what", label: "What is this?" },
    { id: "how", label: "How it's built" },
    { id: "architecture", label: "Architecture" },
    { id: "contributing", label: "Contributing" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[var(--accent-primary)] mb-6">About LC-3b Simulator</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b-2 border-[var(--border-contrast)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button px-4 py-2 ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "what" && <WhatIsThisTab />}
        {activeTab === "how" && <HowItsBuiltTab />}
        {activeTab === "architecture" && <ArchitectureTab />}
        {activeTab === "contributing" && <ContributingTab />}
      </div>

      <section className="text-center text-[var(--text-muted)] text-sm mt-8 pt-6 border-t border-[var(--border-color)]">
        <p>Made with Rust, React, and WebAssembly</p>
      </section>
    </div>
  );
}

function WhatIsThisTab() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">LC-3b Simulator</h2>
        <p className="text-[var(--text-primary)] leading-relaxed">
          This is a browser-based emulator for the <strong>LC-3b</strong> (Little Computer 3, byte-addressable variant), 
          a 16-bit von Neumann architecture designed for teaching computer organization and assembly language programming.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-2">Technical Specifications</h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">Word Size:</span>
              <span className="text-[var(--text-primary)] ml-2">16 bits</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Address Space:</span>
              <span className="text-[var(--text-primary)] ml-2">64KB (2<sup>16</sup> bytes)</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Addressing:</span>
              <span className="text-[var(--text-primary)] ml-2">Byte-addressable</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Registers:</span>
              <span className="text-[var(--text-primary)] ml-2">8 general-purpose (R0-R7)</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Condition Codes:</span>
              <span className="text-[var(--text-primary)] ml-2">N (negative), Z (zero), P (positive)</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Instructions:</span>
              <span className="text-[var(--text-primary)] ml-2">15 opcodes (4-bit encoding)</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-2">Features</h3>
        <ul className="space-y-2 text-[var(--text-primary)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>Two-pass assembler</strong> - Converts LC-3b assembly to machine code with symbol resolution</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>C compiler</strong> - Compiles a subset of C to LC-3b assembly</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>Step debugger</strong> - Execute instructions one at a time with full state inspection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>Memory viewer</strong> - Real-time instruction decoding at the program counter</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>AI teaching assistant</strong> - Browser-local LLM for LC-3b help (optional 4.3GB download)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-success)]">+</span>
            <span><strong>Fully client-side</strong> - All computation runs in your browser via WebAssembly</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-2">Resources</h3>
        <ul className="space-y-2">
          <li>
            <a
              href="https://www.mheducation.com/highered/product/introduction-computing-systems-bits-gates-c-beyond-patt-patel/M9781260150537.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Introduction to Computing Systems (Patt & Patel)
            </a>
            <span className="text-[var(--text-muted)] ml-2">- The official LC-3b textbook</span>
          </li>
          <li>
            <a
              href="https://users.ece.utexas.edu/~patt/21s.460n/handouts/appA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              LC-3b ISA Reference (PDF)
            </a>
            <span className="text-[var(--text-muted)] ml-2">- Instruction set documentation</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function HowItsBuiltTab() {
  return (
    <div className="space-y-8">
      {/* Core */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Emulator Core</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4">
          <p className="text-[var(--text-primary)] mb-4">
            The emulator is implemented in{" "}
            <a href="https://www.rust-lang.org/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              Rust
            </a>{" "}
            and compiled to{" "}
            <a href="https://webassembly.org/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              WebAssembly
            </a>{" "}
            (~115 KB). The codebase is organized into several crates:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b-isa" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b-isa</a>
              <span className="text-[var(--text-primary)]">Instruction set types, encoding/decoding between Rust enums and 16-bit words</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b-assembler" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b-assembler</a>
              <span className="text-[var(--text-primary)]">Two-pass assembler using pest parser - handles labels, directives, and code generation</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b-c-grammar" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b-c-grammar</a>
              <span className="text-[var(--text-primary)]">PEG grammar for a C subset (functions, loops, conditionals, basic types)</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b-c-ast" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b-c-ast</a>
              <span className="text-[var(--text-primary)]">Abstract syntax tree types for the C subset</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b-c-compiler" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b-c-compiler</a>
              <span className="text-[var(--text-primary)]">AST to LC-3b assembly code generator with register allocation</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/tree/main/lc3b" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">lc3b</a>
              <span className="text-[var(--text-primary)]">Computer emulator (CPU, memory, execution) with WASM bindings</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Frontend */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Frontend</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4">
          <p className="text-[var(--text-primary)] mb-4">
            The UI is built with{" "}
            <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              React
            </a>{" "}
            and{" "}
            <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              TypeScript
            </a>
            , styled with{" "}
            <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              Tailwind CSS
            </a>
            . Key components:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/blob/main/lc3b-react/src/Computer.tsx" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">Computer.tsx</a>
              <span className="text-[var(--text-primary)]">Main simulator - code editor, WASM integration, execution controls</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/blob/main/lc3b-react/src/RegisterSet.tsx" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">RegisterSet.tsx</a>
              <span className="text-[var(--text-primary)]">R0-R7 display with change highlighting</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/blob/main/lc3b-react/src/MemoryViewer.tsx" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">MemoryViewer.tsx</a>
              <span className="text-[var(--text-primary)]">Memory inspection with instruction decoding</span>
            </li>
            <li className="flex items-start gap-3">
              <a href="https://github.com/lc3b/lc3b-rs/blob/main/lc3b-react/src/Agent.tsx" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-mono min-w-[140px]">Agent.tsx</a>
              <span className="text-[var(--text-primary)]">AI assistant chat interface and status display</span>
            </li>
          </ul>
        </div>
      </section>

      {/* AI Agent */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">AI Teaching Assistant</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4">
          <p className="text-[var(--text-primary)] mb-4">
            The AI assistant runs entirely in your browser using{" "}
            <a href="https://mlc.ai/web-llm/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              WebLLM
            </a>
            , which executes large language models via WebGPU. No data is sent to external servers.
          </p>
          <ul className="space-y-2 text-sm text-[var(--text-primary)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-primary)] font-mono min-w-[140px]">Model</span>
              <span>Hermes-3-Llama-3.1-8B (4.3 GB, cached in browser storage)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-primary)] font-mono min-w-[140px]">Inference</span>
              <span>WebGPU acceleration - runs on your GPU for fast responses</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-primary)] font-mono min-w-[140px]">Context</span>
              <span>Receives current simulator state (registers, PC, code) with each message</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-primary)] font-mono min-w-[140px]">System Prompt</span>
              <span>Includes comprehensive LC-3b ISA reference, common patterns, and error guidance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-primary)] font-mono min-w-[140px]">Streaming</span>
              <span>Responses stream token-by-token with real-time speed display (tok/s)</span>
            </li>
          </ul>
          <p className="text-[var(--text-muted)] text-sm mt-4">
            Requires WebGPU support (Chrome 113+, Edge 113+, or Firefox with webgpu.enabled flag).
          </p>
        </div>
      </section>

      {/* Build & Deploy */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Build & Deployment</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 space-y-3 text-[var(--text-primary)]">
          <p>
            <code className="text-[var(--accent-secondary)]">cargo build</code> compiles the WASM module and bundles 
            everything into a single Rust binary for local development via an embedded Axum web server.
          </p>
          <p>
            For production, static files are deployed to{" "}
            <a href="https://pages.github.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-secondary)] hover:underline">
              GitHub Pages
            </a>
            . Total download: ~170 KB (excluding the optional AI model).
          </p>
        </div>
      </section>
    </div>
  );
}

function ArchitectureTab() {
  return (
    <div className="space-y-8">
      {/* High-Level Overview */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">System Overview</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
╔═ Web Browser ════════════════════════════════════════════════════╗
║                                                                  ║░
║  ┏━━━━━━━━━━━━━━━━━━━━┓        ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓     ║░
║  ┃  React Frontend    ┃        ┃   WebLLM (AI Agent)       ┃     ║░
║  ┃  (TypeScript)      ┃        ┃   (WebGPU)                ┃     ║░
║  ┗━━━━━━━━━┳━━━━━━━━━━┛        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛     ║░
║            ┃                                                     ║░
║            ┃ wasm-bindgen                                        ║░
║            ▼                                                     ║░
║  ╔═ WebAssembly Module (Rust) ═══════════════════════════════╗   ║░
║  ║                                                           ║░  ║░
║  ║  ┏━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━┓    ║░  ║░
║  ║  ┃  Assembler  ┃  ┃  C Compiler  ┃  ┃    Emulator    ┃    ║░  ║░
║  ║  ┗━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━┛    ║░  ║░
║  ║                                                           ║░  ║░
║  ╚═══════════════════════════════════════════════════════════╝░  ║░
║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ║░
║                                                                  ║░
╚══════════════════════════════════════════════════════════════════╝░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>

      {/* Rust Crate Dependencies */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Rust Crate Structure</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
                      ╔═ lc3b ═══════════════════════════════╗
                      ║  WASM bindings + Computer struct     ║░
                      ╚════════════════╦════════════════════╝░
                       ░░░░░░░░░░░░░░░░║░░░░░░░░░░░░░░░░░░░░░░
              ┌────────────────────────╬────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
┏━━━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━━━┓  ╔═ lc3b-isa ═════════╗
┃   lc3b-assembler    ┃  ┃   lc3b-c-compiler   ┃  ║                    ║░
┃                     ┃░ ┃                     ┃░ ║  Instruction types ║░
┃  Assembly → Binary  ┃░ ┃   C → Assembly      ┃░ ║  Encode/Decode     ║░
┗━━━━━━━━━━┳━━━━━━━━━━┛░ ┗━━━━━━━━━━┳━━━━━━━━━━┛░ ╚════════════════════╝░
 ░░░░░░░░░░║░░░░░░░░░░░░  ░░░░░░░░░░║░░░░░░░░░░░░  ░░░░░░░░░▲░░░░░░░░░░░
           │                        │                       │
           │                        ▼                       │
           │             ┏━━━━━━━━━━━━━━━━━━━━━┓            │
           │             ┃    lc3b-c-ast       ┃            │
           │             ┃                     ┃░           │
           │             ┃  AST types for C    ┃░           │
           │             ┗━━━━━━━━━━┳━━━━━━━━━━┛░           │
           │              ░░░░░░░░░░║░░░░░░░░░░░░           │
           │                        ▼                       │
           │             ┏━━━━━━━━━━━━━━━━━━━━━┓            │
           │             ┃   lc3b-c-grammar    ┃            │
           │             ┃                     ┃░           │
           │             ┃  PEG parser (pest)  ┃░           │
           │             ┗━━━━━━━━━━━━━━━━━━━━━┛░           │
           │              ░░░░░░░░░░░░░░░░░░░░░░░           │
           └───────────────────────┴───────────────────────┘
`}</pre>
        </div>
      </section>

      {/* Assembly Pipeline */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Assembly Pipeline</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
╔══════════════╗     ┏━━━━━━━━━━━━━━┓     ┏━━━━━━━━━━━━━━┓     ╔══════════════╗
║   Assembly   ║     ┃   Pass 1     ┃     ┃   Pass 2     ┃     ║   Binary     ║
║    Source    ║────▶┃   (Symbols)  ┃────▶┃   (Codegen)  ┃────▶║   Words      ║
║              ║░    ┃              ┃░    ┃              ┃░    ║              ║░
║  .ORIG x3000 ║░    ┃ Build symbol ┃░    ┃ Resolve refs ┃░    ║  [0x3000]:   ║░
║  LD R0, VAL  ║░    ┃ table with   ┃░    ┃ Encode each  ┃░    ║    0x2001    ║░
║  HALT        ║░    ┃ addresses    ┃░    ┃ instruction  ┃░    ║    0xF025    ║░
║  VAL .FILL 5 ║░    ┃              ┃░    ┃              ┃░    ║    0x0005    ║░
╚══════════════╝░    ┗━━━━━━━━━━━━━━┛░    ┗━━━━━━━━━━━━━━┛░    ╚══════════════╝░
 ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>

      {/* C Compilation Pipeline */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">C Compilation Pipeline</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
╔══════════════╗     ┏━━━━━━━━━━━━━━┓     ┏━━━━━━━━━━━━━━┓     ╔══════════════╗
║   C Source   ║     ┃    Parse     ┃     ┃   Codegen    ┃     ║   Assembly   ║
║              ║────▶┃    (pest)    ┃────▶┃              ┃────▶║              ║
║              ║░    ┃              ┃░    ┃              ┃░    ║              ║░
║  int main(){ ║░    ┃  Program     ┃░    ┃  Register    ┃░    ║  .ORIG x3000 ║░
║    int x = 5;║░    ┃    Function  ┃░    ┃  allocation  ┃░    ║  AND R0,R0,0 ║░
║    return x; ║░    ┃      Block   ┃░    ┃  Stack frame ┃░    ║  ADD R0,R0,5 ║░
║  }           ║░    ┃        Decl  ┃░    ┃  management  ┃░    ║  HALT        ║░
║              ║░    ┃        Ret   ┃░    ┃              ┃░    ║  .END        ║░
╚══════════════╝░    ┗━━━━━━━━━━━━━━┛░    ┗━━━━━━━━━━━━━━┛░    ╚══════════════╝░
 ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░     ░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>

      {/* Execution Cycle */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">CPU Execution Cycle</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
                    ╔═ FETCH ═════════════════════════════╗
                    ║   instruction = memory[PC]          ║░
                    ╚═════════════════╦═══════════════════╝░
                     ░░░░░░░░░░░░░░░░░║░░░░░░░░░░░░░░░░░░░░░
                                      ▼
                    ┏━ DECODE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                    ┃   PC = PC + 1  (word increment)     ┃░
                    ┃   opcode = instruction[15:12]       ┃░
                    ┃   extract operands based on opcode  ┃░
                    ┗━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━┛░
                     ░░░░░░░░░░░░░░░░░║░░░░░░░░░░░░░░░░░░░░░
                                      ▼
                    ┏━ EXECUTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                    ┃                                     ┃░
                    ┃   ADD: DR = SR1 + SR2/imm5          ┃░
                    ┃   LD:  DR = memory[PC + offset9]    ┃░
                    ┃   BR:  if(cond) PC = PC + offset9   ┃░
                    ┃   ...                               ┃░
                    ┗━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━┛░
                     ░░░░░░░░░░░░░░░░░║░░░░░░░░░░░░░░░░░░░░░
                                      ▼
                    ╔═ UPDATE CONDITION CODES ════════════╗
                    ║   (for ALU and load operations)     ║░
                    ║                                     ║░
                    ║   N = (result < 0)                  ║░
                    ║   Z = (result == 0)                 ║░
                    ║   P = (result > 0)                  ║░
                    ╚═════════════════════════════════════╝░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>

      {/* React-WASM Bridge */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">React-WASM Integration</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
╔═ React (Computer.tsx) ══════════╗         ╔═ WASM (wasm/mod.rs) ═════════╗
║                                 ║         ║                              ║░
║  computerRef = useRef()         ║         ║                              ║░
║                                 ║         ║                              ║░
║  // Load program                ║         ║                              ║░
║  computerRef.current =          ║────────▶║  new_computer(asm, cbs)      ║░
║    new_computer(asm, cbs)       ║         ║    → assembler.parse()       ║░
║                                 ║         ║    → Computer::new()         ║░
║                                 ║         ║    → load_program()          ║░
║  // Step execution              ║         ║                              ║░
║  next_instruction(cpu)          ║────────▶║  next_instruction(cpu)       ║░
║                                 ║         ║    → fetch()                 ║░
║                                 ║         ║    → decode()                ║░
║  // Read state                  ║         ║    → execute()               ║░
║  pc = program_counter(cpu)      ║◀────────║  program_counter()           ║░
║  r0 = register0(cpu)            ║◀────────║  register0()                 ║░
║  n = condition_n(cpu)           ║◀────────║  condition_n()               ║░
║                                 ║         ║                              ║░
║  setState({ pc, r0, n })        ║         ║                              ║░
║  // React re-renders UI         ║         ║                              ║░
╚═════════════════════════════════╝         ╚══════════════════════════════╝░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>

      {/* AI Agent Flow */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">AI Agent Data Flow</h2>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">{`
┏━━━━━━━━━━━━━━━━━┓   ┏━━━━━━━━━━━━━━━━━┓   ╔═ WebLLM ═══════════════════════╗
┃  User Message   ┃   ┃  Simulator      ┃   ║       (Browser GPU)            ║░
┃                 ┃░  ┃  State          ┃░  ╚════════════════╦═══════════════╝░
┗━━━━━━━━┳━━━━━━━━┛░  ┗━━━━━━━━┳━━━━━━━━┛░   ░░░░░░░░░░░░░░░░║░░░░░░░░░░░░░░░░░
 ░░░░░░░░║░░░░░░░░░░   ░░░░░░░░║░░░░░░░░░░                   ║
         │                     │                             ║
         │     ╔═ AgentContext.tsx ═════════════════╗        ║
         │     ║                                    ║░       ║
         └────▶║  1. Capture simulator state        ║░       ║
               ║     (PC, registers, code)          ║░       ║
               ║                                    ║░       ║
               ║  2. Build system prompt with       ║░       ║
               ║     LC-3b ISA reference            ║░       ║
               ║                                    ║░       ║
               ║  3. Inject state + user msg        ║───────▶║
               ║                                    ║░       ║
               ║  4. Stream response tokens         ║◀───────║
               ║     Update UI in real-time         ║░       ║
               ║                                    ║░       ▼
               ║  5. Track tok/s metrics            ║░  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
               ╚════════════════════════════════════╝░  ┃  Hermes-3-Llama-3.1-8B      ┃
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ┃  (4.3 GB, cached locally)   ┃░
                                                        ┃                             ┃░
                                                        ┃  Inference via WebGPU       ┃░
                                                        ┃  No server communication    ┃░
                                                        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛░
                                                         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`}</pre>
        </div>
      </section>
    </div>
  );
}

function ContributingTab() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-[var(--accent-secondary)] mb-3">Contributing</h2>
        <p className="text-[var(--text-primary)] leading-relaxed">
          Contributions are welcome! The project is open source under the MIT license.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-3">Repository</h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4">
          <a
            href="https://github.com/lc3b/lc3b-rs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-[var(--accent-primary)] hover:underline text-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            github.com/lc3b/lc3b-rs
          </a>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-3">Getting Started</h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 space-y-4">
          <div>
            <h4 className="text-[var(--text-primary)] font-medium mb-2">Prerequisites</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              <li>- Rust toolchain (rustup)</li>
              <li>- wasm-pack</li>
              <li>- Node.js and npm</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text-primary)] font-medium mb-2">Build & Run</h4>
            <div className="bg-[var(--bg-tertiary)] rounded p-3 font-mono text-sm">
              <div className="text-[var(--text-muted)]"># Clone the repository</div>
              <div className="text-[var(--text-primary)]">git clone https://github.com/lc3b/lc3b-rs.git</div>
              <div className="text-[var(--text-primary)]">cd lc3b-rs</div>
              <div className="text-[var(--text-muted)] mt-2"># Build and run</div>
              <div className="text-[var(--text-primary)]">cargo run -p lc3b-web</div>
              <div className="text-[var(--text-muted)] mt-2"># Open http://localhost:3000</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-3">Areas for Contribution</h3>
        <ul className="space-y-2 text-[var(--text-primary)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)]">*</span>
            <span><strong>C compiler improvements</strong> - Add more C language features (arrays, pointers, structs)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)]">*</span>
            <span><strong>Debugger features</strong> - Breakpoints, watch expressions, call stack</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)]">*</span>
            <span><strong>Documentation</strong> - Tutorials, examples, API documentation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)]">*</span>
            <span><strong>Testing</strong> - Unit tests, integration tests, fuzzing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)]">*</span>
            <span><strong>UI/UX</strong> - Accessibility, mobile support, themes</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--accent-secondary)] mb-3">License</h3>
        <p className="text-[var(--text-primary)]">
          This project is licensed under the{" "}
          <a
            href="https://github.com/lc3b/lc3b-rs/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-primary)] hover:underline"
          >
            MIT License
          </a>
          .
        </p>
      </section>
    </div>
  );
}

export default About;
