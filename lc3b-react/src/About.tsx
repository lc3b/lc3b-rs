function About() {
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
          <ul className="space-y-4 text-[#ccc]">
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5 min-w-[50px]">CORE</span>
              <span>
                The emulator core is written in{" "}
                <a
                  href="https://www.rust-lang.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  Rust
                </a>{" "}
                and compiled to{" "}
                <a
                  href="https://webassembly.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  WebAssembly
                </a>{" "}
                (~115 KB). Everything runs entirely in your browser - no server-side processing required.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5 min-w-[50px]">UI</span>
              <span>
                The frontend is built with{" "}
                <a
                  href="https://react.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  React
                </a>{" "}
                and{" "}
                <a
                  href="https://www.typescriptlang.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  TypeScript
                </a>
                , styled with{" "}
                <a
                  href="https://tailwindcss.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  Tailwind CSS
                </a>{" "}
                (~55 KB gzipped).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5 min-w-[50px]">BUILD</span>
              <span>
                A single <code className="text-[#4ecca3]">cargo build</code> command builds
                the WASM module and React app together, embedding everything into a standalone
                Rust binary for local development.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#e94560] font-mono text-sm mt-0.5 min-w-[50px]">HOST</span>
              <span>
                Deployed as static files on{" "}
                <a
                  href="https://pages.github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ecca3] hover:underline"
                >
                  GitHub Pages
                </a>
                . Total download size is approximately 170 KB.
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
