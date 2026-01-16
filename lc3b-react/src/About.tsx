function About() {
  const supportedInstructions = [
    { name: "ADD", supported: true, description: "Add two values" },
    { name: "AND", supported: true, description: "Bitwise AND" },
    { name: "BR", supported: true, description: "Conditional branch" },
    { name: "JMP", supported: true, description: "Unconditional jump" },
    { name: "JSR/JSRR", supported: true, description: "Jump to subroutine" },
    { name: "LDB", supported: false, description: "Load byte from memory" },
    { name: "LDW", supported: false, description: "Load word from memory" },
    { name: "LEA", supported: true, description: "Load effective address" },
    { name: "NOT", supported: true, description: "Bitwise NOT" },
    { name: "RET", supported: true, description: "Return from subroutine" },
    { name: "RTI", supported: false, description: "Return from interrupt" },
    { name: "LSHF", supported: false, description: "Left shift" },
    { name: "RSHFL", supported: false, description: "Right shift logical" },
    { name: "RSHFA", supported: false, description: "Right shift arithmetic" },
    { name: "STB", supported: false, description: "Store byte to memory" },
    { name: "STW", supported: false, description: "Store word to memory" },
    { name: "TRAP", supported: false, description: "System call" },
    { name: "XOR", supported: true, description: "Bitwise XOR" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-[#e94560] mb-6">About LC-3b Simulator</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#4ecca3] mb-3">What is this?</h2>
        <p className="text-[#ccc] leading-relaxed">
          This is a web-based emulator for the LC-3b computer architecture. The LC-3b is a
          16-bit computer used in computer architecture courses to teach assembly language
          programming and computer organization concepts.
        </p>
        <p className="text-[#ccc] leading-relaxed mt-3">
          Unlike traditional emulators, this implementation stores instructions directly in
          memory as raw 16-bit words, just like real hardware. Programs are loaded at address
          0x3000 and can be inspected in the memory viewer.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#4ecca3] mb-3">Supported Instructions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {supportedInstructions.map((inst) => (
            <div
              key={inst.name}
              className="bg-[#0f0f1a] rounded-md p-2 flex items-center gap-2"
              title={inst.description}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  inst.supported ? "bg-[#4ecca3]" : "bg-[#555]"
                }`}
              />
              <span className={inst.supported ? "text-[#ccc]" : "text-[#666]"}>
                {inst.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[#888] text-sm mt-2">
          Green = implemented, Gray = not yet implemented
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#4ecca3] mb-3">Resources</h2>
        <ul className="space-y-2">
          <li>
            <a
              href="https://www.mheducation.com/highered/product/introduction-computing-systems-bits-gates-c-beyond-patt-patel/M9781260150537.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e94560] hover:underline"
            >
              Introduction to Computing Systems (Patt & Patel)
            </a>
            <span className="text-[#888] ml-2">- The official LC-3b textbook</span>
          </li>
          <li>
            <a
              href="https://users.ece.utexas.edu/~patt/21s.460n/handouts/appA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e94560] hover:underline"
            >
              LC-3b ISA Reference (PDF)
            </a>
            <span className="text-[#888] ml-2">- Instruction set documentation</span>
          </li>
          <li>
            <a
              href="https://github.com/lc3b/lc3b-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e94560] hover:underline"
            >
              GitHub Repository
            </a>
            <span className="text-[#888] ml-2">- Source code and issue tracker</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#4ecca3] mb-3">How It's Built</h2>
        <div className="bg-[#0f0f1a] rounded-lg p-4">
          <ul className="space-y-3 text-[#ccc]">
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5">CORE</span>
              <span>
                The emulator core is written in <strong className="text-[#4ecca3]">Rust</strong> and
                compiled to <strong className="text-[#4ecca3]">WebAssembly</strong> for fast,
                portable execution in the browser.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5">UI</span>
              <span>
                The frontend is built with <strong className="text-[#4ecca3]">React</strong> and{" "}
                <strong className="text-[#4ecca3]">TypeScript</strong>, styled with{" "}
                <strong className="text-[#4ecca3]">Tailwind CSS</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5">BUILD</span>
              <span>
                A single <strong className="text-[#4ecca3]">cargo build</strong> command builds
                the WASM module and React app together, embedding everything into a standalone
                Rust binary.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5">HOST</span>
              <span>
                Deployed as static files on <strong className="text-[#4ecca3]">GitHub Pages</strong>.
                Everything runs entirely in your browser - no server required.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="text-center text-[#666] text-sm">
        <p>Made with Rust, React, and WebAssembly</p>
      </section>
    </div>
  );
}

export default About;
