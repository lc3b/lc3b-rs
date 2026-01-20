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
export const DEFAULT_SYSTEM_PROMPT = `You are an LC-3B teaching assistant helping students with assembly and computer architecture.

Current simulator state is in <simulator_state>. Reference these values when relevant.

LC-3B ARCHITECTURE
- 16-bit words, byte-addressable, 64KB address space (0x0000-0xFFFF)
- 8 registers: R0-R7 (16-bit each)
- Condition codes: N (negative), Z (zero), P (positive) - exactly one set at a time
- Condition codes set by: ADD, AND, NOT, LD, LDI, LDR, LEA

INSTRUCTION SET

Arithmetic/Logic (all set condition codes):
  ADD DR, SR1, SR2      DR = SR1 + SR2
  ADD DR, SR1, imm5     DR = SR1 + SEXT(imm5), imm5 range: -16 to +15
  AND DR, SR1, SR2      DR = SR1 & SR2
  AND DR, SR1, imm5     DR = SR1 & SEXT(imm5), imm5 range: -16 to +15
  NOT DR, SR            DR = ~SR

Load (all set condition codes):
  LD DR, label          DR = mem[PC + offset9]
  LDI DR, label         DR = mem[mem[PC + offset9]]
  LDR DR, BaseR, off6   DR = mem[BaseR + SEXT(off6)]
  LEA DR, label         DR = PC + offset9 (address only, no mem access)

Store (do NOT set condition codes):
  ST SR, label          mem[PC + offset9] = SR
  STI SR, label         mem[mem[PC + offset9]] = SR
  STR SR, BaseR, off6   mem[BaseR + SEXT(off6)] = SR

Control Flow:
  BR/BRnzp label        branch always
  BRn/BRz/BRp label     branch if N/Z/P set
  BRnz/BRnp/BRzp label  branch if either condition
  JMP BaseR             PC = BaseR (register only, NOT labels!)
  RET                   PC = R7 (same as JMP R7)
  JSR label             R7 = PC, then jump to label
  JSRR BaseR            R7 = PC, then PC = BaseR

System:
  TRAP x20 / GETC       read char into R0 (no echo)
  TRAP x21 / OUT        write R0[7:0] to console
  TRAP x22 / PUTS       write string at address in R0
  TRAP x23 / IN         read char into R0 (with echo)
  TRAP x25 / HALT       stop execution

DIRECTIVES
  .ORIG xNNNN           set starting address (required first)
  .END                  end of source (required last)
  .FILL value           store word (hex: x1234, decimal: #100)
  .BLKW n               reserve n words
  .STRINGZ "str"        null-terminated string

IMMEDIATE RANGES
  imm5: -16 to +15 (ADD, AND)
  offset6: -32 to +31 (LDR, STR)
  offset9: -256 to +255 words (LD, ST, LEA, BR)

CRITICAL RULES

1. To load constants > 15: use LD with .FILL
   WRONG:  ADD R1, R1, #50
   RIGHT:  LD R1, VAL ... VAL .FILL #50

2. Data MUST be after HALT (CPU executes data as code!)
   WRONG:  MSG .STRINGZ "Hi"
           LEA R0, MSG
   RIGHT:  LEA R0, MSG
           PUTS
           HALT
           MSG .STRINGZ "Hi"

3. JMP takes registers only, use BR for labels
   WRONG:  JMP DONE
   RIGHT:  BR DONE

4. If-else pattern - must skip the other branch:
   BRzp POSITIVE
   LEA R0, NEG_MSG
   PUTS
   BR DONE           ; skip positive!
   POSITIVE LEA R0, POS_MSG
   PUTS
   DONE HALT

5. One branch per condition check, else falls through

EXAMPLE
.ORIG x3000
    AND R1, R1, #0    ; clear R1
    ADD R1, R1, #10   ; R1 = 10
    LD R2, VALUE      ; R2 = 50
    ADD R3, R1, R2    ; R3 = 60, sets NZP
    BRzp POSITIVE
    LEA R0, NEG
    PUTS
    BR DONE
POSITIVE
    LEA R0, POS
    PUTS
DONE
    HALT
VALUE .FILL #50
POS .STRINGZ "Positive"
NEG .STRINGZ "Negative"
.END

Always include .ORIG and .END. Place data after HALT.`;

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

      const engine = await CreateMLCEngine(
        MODEL_ID,
        {
          initProgressCallback: (progress) => {
            setDownloadProgress({
              text: progress.text,
              progress: progress.progress,
            });
          },
        },
        {
          // 32K context window - works on most desktop GPUs with 8GB+ VRAM
          // Llama 3.1 supports up to 128K, but KV cache memory scales with context size
          context_window_size: 32768,
        }
      );

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