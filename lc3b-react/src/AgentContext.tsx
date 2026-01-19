import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import type { MLCEngine, ChatCompletionMessageParam } from "@mlc-ai/web-llm";

// Cache item info for display
export interface CacheItemInfo {
  cacheName: string;
  url: string;
  size: number | null;
  sizeFormatted: string;
}

export interface CacheInfo {
  cacheName: string;
  itemCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  items: CacheItemInfo[];
}

// Agent status states
export type AgentStatus = "disabled" | "downloading" | "available" | "running";

// Browser detection for cache info
export type BrowserInfo = {
  name: string;
  cacheSupport: "full" | "limited" | "unknown";
  cacheNotes: string;
};

// Download progress info
export interface DownloadProgress {
  text: string;
  progress: number; // 0-1
}

// Chat message type
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Generation statistics
export interface GenerationStats {
  tokensGenerated: number;
  startTime: number;
  endTime?: number;
  tokensPerSecond: number;
}

// LC-3B state that can be read by the agent
export interface LC3BState {
  cCode: string;
  assembly: string;
  registers: {
    r0: number;
    r1: number;
    r2: number;
    r3: number;
    r4: number;
    r5: number;
    r6: number;
    r7: number;
  };
  pc: number;
  conditions: {
    n: boolean;
    z: boolean;
    p: boolean;
  };
  isHalted: boolean;
  consoleOutput: string;
}

// Build the state context string to inject into messages
export function buildStateContext(state: LC3BState | null): string {
  if (!state) {
    return "<simulator_state>\nNo simulator state available. The program may not be loaded yet.\n</simulator_state>";
  }

  const { registers, pc, conditions, isHalted, consoleOutput, assembly, cCode } = state;
  
  const lines = [
    "<simulator_state>",
    `PC: 0x${pc.toString(16).toUpperCase().padStart(4, "0")} (${pc})`,
    `Condition Codes: N=${conditions.n ? 1 : 0} Z=${conditions.z ? 1 : 0} P=${conditions.p ? 1 : 0}`,
    `Status: ${isHalted ? "HALTED" : "Running"}`,
    "",
    "Registers:",
    `  R0: 0x${registers.r0.toString(16).toUpperCase().padStart(4, "0")} (${registers.r0})`,
    `  R1: 0x${registers.r1.toString(16).toUpperCase().padStart(4, "0")} (${registers.r1})`,
    `  R2: 0x${registers.r2.toString(16).toUpperCase().padStart(4, "0")} (${registers.r2})`,
    `  R3: 0x${registers.r3.toString(16).toUpperCase().padStart(4, "0")} (${registers.r3})`,
    `  R4: 0x${registers.r4.toString(16).toUpperCase().padStart(4, "0")} (${registers.r4})`,
    `  R5: 0x${registers.r5.toString(16).toUpperCase().padStart(4, "0")} (${registers.r5})`,
    `  R6: 0x${registers.r6.toString(16).toUpperCase().padStart(4, "0")} (${registers.r6})`,
    `  R7: 0x${registers.r7.toString(16).toUpperCase().padStart(4, "0")} (${registers.r7})`,
  ];

  if (consoleOutput) {
    lines.push("", "Console Output:", consoleOutput);
  }

  if (assembly) {
    lines.push("", "Assembly Code:", assembly);
  }

  if (cCode) {
    lines.push("", "C Source Code:", cCode);
  }

  lines.push("</simulator_state>");
  
  return lines.join("\n");
}

// Default system prompt
export const DEFAULT_SYSTEM_PROMPT = `You are an LC-3B teaching assistant. You help students understand LC-3B assembly, C code, and computer architecture concepts.

The current simulator state is provided below in the <simulator_state> section. Reference these actual values when answering questions.

## LC-3B Architecture Overview

- **Word size**: 16 bits
- **Memory**: Byte-addressable, 16-bit address space (addresses 0x0000-0xFFFF)
- **Registers**: 8 general-purpose registers (R0-R7), all 16-bit
- **Special registers**: PC (Program Counter), IR (Instruction Register), PSR (Processor Status Register)
- **Condition codes**: N (negative), Z (zero), P (positive) - exactly ONE is set at any time

## Condition Codes (N, Z, P)

Condition codes are set automatically after these instructions: ADD, AND, NOT, LD, LDI, LDR, LEA
- N=1 if result is negative (bit 15 = 1)
- Z=1 if result is zero
- P=1 if result is positive (bit 15 = 0 and result != 0)

## LC-3B Instruction Set

### Arithmetic/Logic Operations

**ADD** - Addition
- Register mode: \`ADD DR, SR1, SR2\` → DR = SR1 + SR2
- Immediate mode: \`ADD DR, SR1, imm5\` → DR = SR1 + SEXT(imm5)
- imm5 is a 5-bit signed immediate: range -16 to +15
- Sets condition codes

**AND** - Bitwise AND
- Register mode: \`AND DR, SR1, SR2\` → DR = SR1 AND SR2
- Immediate mode: \`AND DR, SR1, imm5\` → DR = SR1 AND SEXT(imm5)
- imm5 is a 5-bit signed immediate: range -16 to +15
- Sets condition codes
- Common idiom: \`AND R0, R0, #0\` clears R0

**NOT** - Bitwise complement
- \`NOT DR, SR\` → DR = NOT(SR)
- Sets condition codes

### Load Instructions

**LD** - Load (PC-relative)
- \`LD DR, LABEL\` → DR = mem[PC + SEXT(PCoffset9)]
- PCoffset9 is 9-bit signed offset (range -256 to +255 words from PC)
- Sets condition codes

**LDI** - Load Indirect
- \`LDI DR, LABEL\` → DR = mem[mem[PC + SEXT(PCoffset9)]]
- First reads address from memory, then reads value from that address
- Sets condition codes

**LDR** - Load Base+Offset
- \`LDR DR, BaseR, offset6\` → DR = mem[BaseR + SEXT(offset6)]
- offset6 is 6-bit signed offset (range -32 to +31 bytes)
- Sets condition codes

**LEA** - Load Effective Address
- \`LEA DR, LABEL\` → DR = PC + SEXT(PCoffset9)
- Computes address, does NOT access memory
- Sets condition codes
- Used to get address of data (e.g., for strings)

### Store Instructions

**ST** - Store (PC-relative)
- \`ST SR, LABEL\` → mem[PC + SEXT(PCoffset9)] = SR
- Does NOT set condition codes

**STI** - Store Indirect
- \`STI SR, LABEL\` → mem[mem[PC + SEXT(PCoffset9)]] = SR
- Does NOT set condition codes

**STR** - Store Base+Offset
- \`STR SR, BaseR, offset6\` → mem[BaseR + SEXT(offset6)] = SR
- Does NOT set condition codes

### Control Flow Instructions

**BR** - Conditional Branch
- \`BRnzp LABEL\` or \`BR LABEL\` - branch always
- \`BRn LABEL\` - branch if N=1 (negative)
- \`BRz LABEL\` - branch if Z=1 (zero)
- \`BRp LABEL\` - branch if P=1 (positive)
- \`BRnz LABEL\` - branch if N=1 or Z=1
- \`BRnp LABEL\` - branch if N=1 or P=1
- \`BRzp LABEL\` - branch if Z=1 or P=1
- Uses PCoffset9 (9-bit signed offset)

**JMP** - Unconditional Jump (register only)
- \`JMP BaseR\` → PC = BaseR
- Jumps to address contained in register
- CANNOT use a label directly! Use \`BR label\` or \`BRnzp label\` for unconditional branch to a label

**RET** - Return from Subroutine
- \`RET\` is equivalent to \`JMP R7\`
- R7 contains return address after JSR/JSRR

**JSR** - Jump to Subroutine (PC-relative)
- \`JSR LABEL\` → R7 = PC, PC = PC + SEXT(PCoffset11)
- Saves return address in R7, then jumps

**JSRR** - Jump to Subroutine (Register)
- \`JSRR BaseR\` → R7 = PC, PC = BaseR
- Saves return address in R7, then jumps to address in register

### System Instructions

**TRAP** - System Call
- \`TRAP trapvect8\` → R7 = PC, PC = mem[ZEXT(trapvect8)]
- Common trap vectors (use these names or hex values):
  - \`GETC\` or \`TRAP x20\` - Read character into R0 (no echo)
  - \`OUT\` or \`TRAP x21\` - Write character from R0[7:0] to console
  - \`PUTS\` or \`TRAP x22\` - Write string (R0 points to null-terminated string)
  - \`IN\` or \`TRAP x23\` - Read character into R0 (with echo and prompt)
  - \`PUTSP\` or \`TRAP x24\` - Write packed string (2 chars per word)
  - \`HALT\` or \`TRAP x25\` - Stop execution

**RTI** - Return from Interrupt
- \`RTI\` - Returns from interrupt/exception handler
- Privileged instruction

### Special

**NOP** - No Operation
- Often encoded as \`BR\` with no conditions or \`0x0000\`

## Assembler Directives

**.ORIG address** - Set starting address
- Must be first non-comment line
- Example: \`.ORIG x3000\`

**.END** - End of program
- Must be last line
- Marks end of assembly source

**.FILL value** - Initialize word
- \`.FILL x1234\` - store hex value
- \`.FILL #100\` - store decimal value
- \`.FILL LABEL\` - store address of label

**.BLKW n** - Reserve n words
- \`.BLKW 10\` - reserve 10 words (initialized to 0)

**.STRINGZ "string"** - Null-terminated string
- \`.STRINGZ "Hello"\` - stores 'H', 'e', 'l', 'l', 'o', 0

## Number Formats

- Hex: \`x1234\` or \`0x1234\`
- Decimal: \`#100\` or just \`100\`
- Binary: \`b1010\` (some assemblers)

## Important Notes

1. **No immediate load instruction**: To load a constant, use:
   - \`AND Rx, Rx, #0\` then \`ADD Rx, Rx, #val\` (for -16 to +15)
   - \`LD Rx, LABEL\` with \`LABEL .FILL value\` (for larger values)

2. **Immediate range limits**:
   - ADD/AND imm5: -16 to +15
   - LDR/STR offset6: -32 to +31
   - LD/ST/LEA/BR PCoffset9: -256 to +255 (words from PC)
   - JSR PCoffset11: -1024 to +1023 (words from PC)

3. **R7 is special**: JSR, JSRR, and TRAP overwrite R7 with return address

4. **String output**: Use LEA to get string address into R0, then PUTS

5. **Labels**: Define without colon, reference by name
   - Definition: \`LOOP ADD R1, R1, #1\`
   - Reference: \`BR LOOP\`

## Control Flow Patterns (IMPORTANT)

### If-Else Pattern
To implement \`if (condition) { A } else { B }\`:
\`\`\`
        ; Assume condition codes already set by previous instruction
        BRcond THEN_BRANCH  ; Branch to THEN if condition met
        ; ELSE branch (condition NOT met, falls through here)
        ... else code ...
        BR DONE             ; Skip the THEN branch
THEN_BRANCH
        ... then code ...
DONE    ... continue ...
\`\`\`

### If Positive/Negative Example
\`\`\`
        ADD R1, R2, R3      ; Sets condition codes based on result
        BRzp IS_POSITIVE    ; If zero or positive, jump to IS_POSITIVE
        ; Negative case (falls through when BRzp not taken)
        LEA R0, NEG_MSG
        PUTS
        BR DONE             ; MUST skip positive case!
IS_POSITIVE
        LEA R0, POS_MSG
        PUTS
DONE    HALT
\`\`\`

### Key Rules:
1. Only ONE branch after setting condition codes - don't chain multiple branches
2. Use \`BR label\` (unconditional) to skip over the other case
3. \`JMP\` takes a REGISTER, not a label - use \`BR\` for labels
4. The "else" case is the fall-through (when branch not taken)

## Common Mistakes to Avoid

1. **Immediate value out of range**: \`ADD R1, R1, #50\` is INVALID - imm5 max is 15. For values > 15, use .FILL:
   \`\`\`
   LD R1, FIFTY
   ...
   FIFTY .FILL #50
   \`\`\`

2. **Data in the execution path**: .STRINGZ and .FILL must be placed AFTER HALT or jumped over. The CPU will try to execute data as instructions!
   \`\`\`
   ; WRONG - string will be executed as code!
   LABEL .STRINGZ "Hello"
         LEA R0, LABEL
   
   ; CORRECT - data after HALT
         LEA R0, MSG
         PUTS
         HALT
   MSG   .STRINGZ "Hello"
   \`\`\`

3. **Chaining multiple branches (WRONG)**:
   \`\`\`
   ; WRONG - confusing and often broken
   BRzp POSITIVE
   BRnz NEGATIVE    ; This makes no sense!
   
   ; CORRECT - one branch, then fall through or unconditional branch
   BRzp POSITIVE    ; If not negative, go to POSITIVE
                    ; Fall through here means negative
   LEA R0, NEG_MSG
   PUTS
   BR DONE          ; Skip positive section
   POSITIVE ...
   \`\`\`

4. **Using JMP with a label (WRONG)**:
   \`\`\`
   ; WRONG - JMP only takes registers
   JMP DONE
   
   ; CORRECT - use BR for labels
   BR DONE
   \`\`\`

5. **Forgetting to skip the other branch**:
   \`\`\`
   ; WRONG - executes BOTH messages!
   BRzp POSITIVE
   LEA R0, NEG_MSG
   PUTS
   POSITIVE LEA R0, POS_MSG   ; Falls through to here!
   PUTS
   
   ; CORRECT - skip with BR
   BRzp POSITIVE
   LEA R0, NEG_MSG
   PUTS
   BR DONE          ; Skip positive!
   POSITIVE LEA R0, POS_MSG
   PUTS
   DONE HALT
   \`\`\`

6. **Using wrong registers**: Read the requirements carefully. If asked to put a value in R3, use R3, not R0.

## Example: Conditional Message Based on Sum

\`\`\`
.ORIG x3000

        ; Initialize R3 = 10 (within imm5 range)
        AND R3, R3, #0      ; Clear R3
        ADD R3, R3, #10     ; R3 = 10
        
        ; Initialize R4 = 50 (too large for imm5, use .FILL)
        LD R4, FIFTY        ; R4 = 50
        
        ; Add R3 + R4, store in R5
        ADD R5, R3, R4      ; R5 = R3 + R4 = 60, sets condition codes
        
        ; Branch based on result (N/Z/P already set by ADD)
        BRzp POSITIVE       ; If zero or positive, go to POSITIVE
                            ; Fall through if negative
        
        ; Negative case
        LEA R0, NEG_MSG     ; Load address of negative message
        PUTS                ; Print it
        BR DONE             ; Skip positive case
        
POSITIVE
        LEA R0, POS_MSG     ; Load address of positive message
        PUTS                ; Print it
        
DONE    HALT                ; Stop execution

; === DATA SECTION (after all code) ===
FIFTY   .FILL #50
POS_MSG .STRINGZ "Wow! Positive!"
NEG_MSG .STRINGZ "Wow, don't be so negative!"

.END
\`\`\`

## Simple Example: Hello World

\`\`\`
.ORIG x3000

        LEA R0, MSG         ; R0 = address of MSG
        PUTS                ; Print string (TRAP x22)
        HALT                ; Stop (TRAP x25)

MSG     .STRINGZ "Hello, World!"

.END
\`\`\`

Be concise, accurate, and reference the actual simulator state shown below when relevant. When writing assembly code, always include .ORIG and .END directives, use correct LC-3B syntax, and place all data (.FILL, .STRINGZ, .BLKW) AFTER the HALT instruction.`;

// Model info - must use a model that supports function calling
// Supported models: Hermes-2-Pro-Llama-3-8B, Hermes-2-Pro-Mistral-7B, Hermes-3-Llama-3.1-8B
export const MODEL_ID = "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";
export const MODEL_SIZE_GB = 4.3;
export const MODEL_SIZE_BYTES = MODEL_SIZE_GB * 1024 * 1024 * 1024;

// Bandwidth estimates for download time calculation
export const BANDWIDTH_ESTIMATES = [
  { name: "Slow (5 Mbps)", mbps: 5 },
  { name: "Average (25 Mbps)", mbps: 25 },
  { name: "Fast (100 Mbps)", mbps: 100 },
  { name: "Very Fast (500 Mbps)", mbps: 500 },
];

export function calculateDownloadTime(mbps: number): string {
  const seconds = (MODEL_SIZE_BYTES * 8) / (mbps * 1000000);
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  }
}

export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;

  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    return {
      name: "Chrome",
      cacheSupport: "full",
      cacheNotes: "Up to 80% of free disk space. Model will persist across sessions.",
    };
  } else if (ua.includes("Edg")) {
    return {
      name: "Edge",
      cacheSupport: "full",
      cacheNotes: "Up to 80% of free disk space. Model will persist across sessions.",
    };
  } else if (ua.includes("Firefox")) {
    return {
      name: "Firefox",
      cacheSupport: "full",
      cacheNotes: "Up to 50% of free disk space. Model will persist across sessions.",
    };
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    return {
      name: "Safari",
      cacheSupport: "limited",
      cacheNotes: "Limited to ~1GB by default. You may be prompted to allow more storage.",
    };
  } else {
    return {
      name: "Unknown Browser",
      cacheSupport: "unknown",
      cacheNotes: "Cache behavior may vary. Model should persist across sessions.",
    };
  }
}

interface AgentContextType {
  status: AgentStatus;
  downloadProgress: DownloadProgress | null;
  chatMessages: ChatMessage[];
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  browserInfo: BrowserInfo;
  storageEstimate: { quota: number; usage: number } | null;
  error: string | null;
  generationStats: GenerationStats | null;

  // Actions
  enableAgent: () => Promise<void>;
  disableAgent: () => void;
  sendMessage: (message: string) => Promise<void>;
  restartAgent: () => Promise<void>;
  clearChat: () => void;
  clearCache: () => Promise<void>;
  
  // Cache inspection
  cacheDetails: CacheInfo[] | null;
  isLoadingCache: boolean;
  inspectCache: () => Promise<void>;
  deleteCacheItem: (cacheName: string, url: string) => Promise<void>;
  deleteEntireCache: (cacheName: string) => Promise<void>;

  // LC-3B state setter (called by Computer component)
  setLC3BState: (state: LC3BState) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AgentStatus>("disabled");
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [browserInfo] = useState<BrowserInfo>(() => detectBrowser());
  const [storageEstimate, setStorageEstimate] = useState<{ quota: number; usage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheDetails, setCacheDetails] = useState<CacheInfo[] | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(null);

  const engineRef = useRef<MLCEngine | null>(null);
  const lc3bStateRef = useRef<LC3BState | null>(null);

  // Check storage on mount
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
        });
      });
    }
  }, []);

  const setLC3BState = useCallback((state: LC3BState) => {
    lc3bStateRef.current = state;
  }, []);

  const getStateContext = useCallback((): string => {
    return buildStateContext(lc3bStateRef.current);
  }, []);

  const enableAgent = useCallback(async () => {
    if (status !== "disabled") return;

    console.log("[Agent] Starting enableAgent...");

    // Check for WebGPU support first
    if (!navigator.gpu) {
      const errorMsg = "WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Firefox with WebGPU enabled.";
      console.error("[Agent]", errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        const errorMsg = "Could not get WebGPU adapter. Your GPU may not be supported.";
        console.error("[Agent]", errorMsg);
        setError(errorMsg);
        return;
      }
      // adapter.info may not be available in all implementations
      console.log("[Agent] WebGPU adapter found");
    } catch (gpuErr) {
      const errorMsg = `WebGPU initialization failed: ${gpuErr instanceof Error ? gpuErr.message : String(gpuErr)}`;
      console.error("[Agent]", errorMsg);
      setError(errorMsg);
      return;
    }

    setStatus("downloading");
    setError(null);
    console.log("[Agent] Status set to downloading, loading WebLLM...");

    try {
      // Dynamic import to avoid loading WebLLM until needed
      console.log("[Agent] Importing @mlc-ai/web-llm...");
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      console.log("[Agent] WebLLM imported, creating engine with model:", MODEL_ID);

      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (progress) => {
          setDownloadProgress({
            text: progress.text,
            progress: progress.progress,
          });
        },
      });

      console.log("[Agent] Engine created successfully");
      engineRef.current = engine;
      setDownloadProgress(null);
      setStatus("available");

      // Request persistent storage
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        console.log("[Agent] Storage persistence:", persisted);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Agent] Failed to create engine:", errorMsg, err);
      setError(errorMsg);
      setStatus("disabled");
      setDownloadProgress(null);
    }
  }, [status]);

  const disableAgent = useCallback(() => {
    if (engineRef.current) {
      engineRef.current = null;
    }
    setStatus("disabled");
    setChatMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!engineRef.current || status !== "available") {
      setError("Agent not available");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setStatus("running");
    setGenerationStats(null);

    try {
      // Get current simulator state to inject into context
      const stateContext = getStateContext();
      
      // Build conversation history for the API
      // We inject state context with the system prompt
      const systemWithState = `${systemPrompt}\n\n${stateContext}`;
      
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemWithState },
        ...chatMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      // Create a placeholder streaming message
      const streamingMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      setChatMessages((prev) => [...prev, streamingMessage]);

      // Track generation stats
      const startTime = performance.now();
      let tokensGenerated = 0;
      let fullContent = "";

      // Use streaming completion
      const stream = await engineRef.current.chat.completions.create({
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullContent += delta;
          tokensGenerated++;
          
          // Update the streaming message content
          setChatMessages((prev) => {
            const newMessages = [...prev];
            const lastIdx = newMessages.length - 1;
            if (lastIdx >= 0 && newMessages[lastIdx].isStreaming) {
              newMessages[lastIdx] = {
                ...newMessages[lastIdx],
                content: fullContent,
              };
            }
            return newMessages;
          });

          // Update stats in real-time
          const currentTime = performance.now();
          const elapsedSeconds = (currentTime - startTime) / 1000;
          setGenerationStats({
            tokensGenerated,
            startTime,
            tokensPerSecond: elapsedSeconds > 0 ? tokensGenerated / elapsedSeconds : 0,
          });
        }
      }

      // Finalize the message (remove streaming flag)
      const endTime = performance.now();
      const elapsedSeconds = (endTime - startTime) / 1000;
      
      setChatMessages((prev) => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (lastIdx >= 0 && newMessages[lastIdx].isStreaming) {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: fullContent,
            isStreaming: false,
          };
        }
        return newMessages;
      });

      // Final stats
      setGenerationStats({
        tokensGenerated,
        startTime,
        endTime,
        tokensPerSecond: elapsedSeconds > 0 ? tokensGenerated / elapsedSeconds : 0,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));

      // Remove the streaming message if it exists and add error message
      setChatMessages((prev) => {
        const filtered = prev.filter(msg => !msg.isStreaming);
        return [...filtered, {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date(),
        }];
      });
      setGenerationStats(null);
    } finally {
      setStatus("available");
    }
  }, [status, systemPrompt, chatMessages, getStateContext]);

  const restartAgent = useCallback(async () => {
    setChatMessages([]);
    setError(null);

    if (engineRef.current) {
      // Engine is already loaded, just clear chat
      return;
    }

    // Otherwise re-enable
    await enableAgent();
  }, [enableAgent]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }, []);

  const inspectCache = useCallback(async () => {
    setIsLoadingCache(true);
    try {
      const cacheNames = await caches.keys();
      const cacheInfos: CacheInfo[] = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const items: CacheItemInfo[] = [];
        let totalSize = 0;

        for (const request of requests) {
          const response = await cache.match(request);
          let size: number | null = null;
          
          if (response) {
            // Try to get size from Content-Length header first
            const contentLength = response.headers.get("Content-Length");
            if (contentLength) {
              size = parseInt(contentLength, 10);
            } else {
              // Fall back to reading the blob (more expensive)
              try {
                const blob = await response.clone().blob();
                size = blob.size;
              } catch {
                size = null;
              }
            }
          }

          if (size !== null) {
            totalSize += size;
          }

          items.push({
            cacheName,
            url: request.url,
            size,
            sizeFormatted: size !== null ? formatBytes(size) : "Unknown",
          });
        }

        cacheInfos.push({
          cacheName,
          itemCount: items.length,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          items,
        });
      }

      // Sort by total size descending
      cacheInfos.sort((a, b) => b.totalSize - a.totalSize);
      setCacheDetails(cacheInfos);
      console.log("[Agent] Cache inspection complete:", cacheInfos);
    } catch (err) {
      console.error("[Agent] Failed to inspect cache:", err);
      setError(`Failed to inspect cache: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoadingCache(false);
    }
  }, [formatBytes]);

  const deleteCacheItem = useCallback(async (cacheName: string, url: string) => {
    try {
      const cache = await caches.open(cacheName);
      const deleted = await cache.delete(url);
      console.log("[Agent] Deleted cache item:", url, deleted);
      
      // Refresh cache details
      await inspectCache();
      
      // Update storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
        });
      }
    } catch (err) {
      console.error("[Agent] Failed to delete cache item:", err);
      setError(`Failed to delete cache item: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [inspectCache]);

  const deleteEntireCache = useCallback(async (cacheName: string) => {
    try {
      // If agent is using this cache, disable it first
      if (engineRef.current) {
        engineRef.current = null;
        setStatus("disabled");
        setChatMessages([]);
      }

      await caches.delete(cacheName);
      console.log("[Agent] Deleted entire cache:", cacheName);
      
      // Refresh cache details
      await inspectCache();
      
      // Update storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
        });
      }
    } catch (err) {
      console.error("[Agent] Failed to delete cache:", err);
      setError(`Failed to delete cache: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [inspectCache]);

  const clearCache = useCallback(async () => {
    try {
      // Disable agent first
      if (engineRef.current) {
        engineRef.current = null;
      }
      setStatus("disabled");
      setChatMessages([]);
      setError(null);

      // Clear all caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log("[Agent] Deleted cache:", cacheName);
      }

      // Clear cache details
      setCacheDetails(null);

      // Update storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
        });
      }

      console.log("[Agent] Cache cleared successfully");
    } catch (err) {
      console.error("[Agent] Failed to clear cache:", err);
      setError(`Failed to clear cache: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        status,
        downloadProgress,
        chatMessages,
        systemPrompt,
        setSystemPrompt,
        browserInfo,
        storageEstimate,
        error,
        generationStats,
        enableAgent,
        disableAgent,
        sendMessage,
        restartAgent,
        clearChat,
        clearCache,
        cacheDetails,
        isLoadingCache,
        inspectCache,
        deleteCacheItem,
        deleteEntireCache,
        setLC3BState,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}