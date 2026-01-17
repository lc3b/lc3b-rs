function About() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-accent-primary mb-6">About LC-3b Simulator</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-accent-secondary mb-3">What is this?</h2>
        <p className="text-text-primary leading-relaxed">
          This is a web-based emulator for the LC-3b computer architecture. The LC-3b is a
          16-bit computer used in computer architecture courses to teach assembly language
          programming and computer organization concepts.
        </p>
        <p className="text-text-primary leading-relaxed mt-3">
          Unlike traditional emulators, this implementation stores instructions directly in
          memory as raw 16-bit words, just like real hardware. Programs are loaded at address
          0x3000 and can be inspected in the memory viewer.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-accent-secondary mb-3">Resources</h2>
        <ul className="space-y-2">
          <li>
            <a
              href="https://www.mheducation.com/highered/product/introduction-computing-systems-bits-gates-c-beyond-patt-patel/M9781260150537.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              Introduction to Computing Systems (Patt & Patel)
            </a>
            <span className="text-text-muted ml-2">- The official LC-3b textbook</span>
          </li>
          <li>
            <a
              href="https://users.ece.utexas.edu/~patt/21s.460n/handouts/appA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              LC-3b ISA Reference (PDF)
            </a>
            <span className="text-text-muted ml-2">- Instruction set documentation</span>
          </li>
          <li>
            <a
              href="https://github.com/lc3b/lc3b-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              GitHub Repository
            </a>
            <span className="text-text-muted ml-2">- Source code and issue tracker</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-accent-secondary mb-3">How It's Built</h2>
        <div className="bg-bg-primary rounded-lg p-4">
          <ul className="space-y-4 text-text-primary">
            <li className="flex items-start gap-3">
              <span className="text-accent-primary font-mono text-sm mt-0.5 min-w-[50px]">CORE</span>
              <span>
                The emulator core is written in{" "}
                <a
                  href="https://www.rust-lang.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  Rust
                </a>{" "}
                and compiled to{" "}
                <a
                  href="https://webassembly.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  WebAssembly
                </a>{" "}
                (~115 KB). Everything runs entirely in your browser - no server-side processing required.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-primary font-mono text-sm mt-0.5 min-w-[50px]">UI</span>
              <span>
                The frontend is built with{" "}
                <a
                  href="https://react.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  React
                </a>{" "}
                and{" "}
                <a
                  href="https://www.typescriptlang.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  TypeScript
                </a>
                , styled with{" "}
                <a
                  href="https://tailwindcss.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  Tailwind CSS
                </a>{" "}
                (~55 KB gzipped).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-primary font-mono text-sm mt-0.5 min-w-[50px]">BUILD</span>
              <span>
                A single <code className="text-accent-secondary">cargo build</code> command builds
                the WASM module and React app together, embedding everything into a standalone
                Rust binary for local development.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-primary font-mono text-sm mt-0.5 min-w-[50px]">HOST</span>
              <span>
                Deployed as static files on{" "}
                <a
                  href="https://pages.github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:underline"
                >
                  GitHub Pages
                </a>
                . Total download size is approximately 170 KB.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-accent-secondary mb-3">Architecture</h2>
        <div className="bg-bg-primary rounded-lg p-6 font-mono text-sm overflow-x-auto">
          <pre className="text-text-primary leading-relaxed whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Web Browser                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         React Application                             │  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐   │  │
│  │   │ Computer.tsx│    │RegisterSet  │    │    MemoryViewer.tsx     │   │  │
│  │   │             │    │    .tsx     │    │                         │   │  │
│  │   │ - assembly  │    │             │    │  Decodes instructions   │   │  │
│  │   │ - pc        │    │ - r0..r7    │    │  from memory words      │   │  │
│  │   │ - registers │    │ - expanded  │    │                         │   │  │
│  │   │ - conditions│    │             │    │                         │   │  │
│  │   └──────┬──────┘    └─────────────┘    └─────────────────────────┘   │  │
│  │          │ useState / useRef                                          │  │
│  └──────────┼────────────────────────────────────────────────────────────┘  │
│             │                                                               │
│             │ computerRef.current (WASM object reference)                   │
│             ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      WASM Binding Layer                              │   │
│  │                        (wasm/mod.rs)                                 │   │
│  │                                                                      │   │
│  │   JavaScript API              Rust Implementation                    │   │
│  │   ──────────────              ───────────────────                    │   │
│  │   new_computer(asm)     ───►  Program::from_assembly()               │   │
│  │                               Computer::new()                        │   │
│  │                               computer.load_program()                │   │
│  │                                                                      │   │
│  │   next_instruction(cpu) ───►  computer.next_instruction()            │   │
│  │                                                                      │   │
│  │   program_counter(cpu)  ◄───  computer.program_counter()             │   │
│  │   register0..7(cpu)     ◄───  computer.register0..7()                │   │
│  │   condition_n/z/p(cpu)  ◄───  computer.condition_n/z/p()             │   │
│  │   read_memory(cpu,addr) ◄───  computer.read_memory(addr)             │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│             │                                                               │
│             │ Compiled to WebAssembly (.wasm)                               │
│             ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Rust Core Library                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │   │
│  │  │   lc3b-isa   │  │lc3b-assembler│  │          lc3b              │  │   │
│  │  │              │  │              │  │                            │  │   │
│  │  │ Instruction  │  │  Assembler   │  │  ┌──────────────────────┐  │  │   │
│  │  │ Register     │◄─┤  (2-pass)    │  │  │      Computer        │  │  │   │
│  │  │ Condition    │  │              │  │  │                      │  │  │   │
│  │  │ PCOffset9    │  │  - pass1:    │  │  │  - program_counter   │  │  │   │
│  │  │ Immediate5   │  │    symbols   │  │  │  - registers[8]      │  │  │   │
│  │  │              │  │  - pass2:    │  │  │  - condition (N/Z/P) │  │  │   │
│  │  │ Encode/Decode│  │    codegen   │  │  │  - memory[64KB]      │  │  │   │
│  │  │ u16 <-> Inst │  │              │  │  │                      │  │  │   │
│  │  └──────────────┘  └──────────────┘  │  │  execute(Instruction)│  │  │   │
│  │                                      │  └──────────────────────┘  │  │   │
│  │                                      └────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                            Data Flow: Load & Execute
                            ─────────────────────────

  1. User writes assembly  ──►  textarea (Computer.tsx state: assembly)
                                     │
  2. Click "Load Program"  ──►  new_computer(assembly, callbacks)
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Program::from_      │
                          │    assembly()        │
                          │  ────────────────    │
                          │  Parse → Instruction │
                          │  Instruction → u16   │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Computer::new()     │
                          │  load_program(words) │
                          │  ────────────────    │
                          │  Words → Memory      │
                          │  PC = 0x3000         │
                          └──────────┬───────────┘
                                     │
                          ComputerResult (Ok/Err)
                                     │
                                     ▼
                          computerRef.current = computer
                          setProgramLoaded(true)
                          updateState()

  3. Click "Execute"       ──►  next_instruction(computerRef.current)
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ fetch_instruction()  │
                          │ ──────────────────── │
                          │ memory[PC] → u16     │
                          │ u16 → Instruction    │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ execute(instruction) │
                          │ ──────────────────── │
                          │ ADD: reg + reg → reg │
                          │ BR:  check cond, PC  │
                          │ etc.                 │
                          │ set_condition_codes()│
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │    updateState()     │
                          │ ──────────────────── │
                          │ program_counter(cpu) │
                          │ register0..7(cpu)    │
                          │ condition_n/z/p(cpu) │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          React setState() triggers re-render
                          UI displays new PC, registers, flags
`}</pre>
        </div>
      </section>

      <section className="text-center text-text-muted text-sm">
        <p>Made with Rust, React, and WebAssembly</p>
      </section>
    </div>
  );
}

export default About;
