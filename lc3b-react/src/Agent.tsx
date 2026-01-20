import { useState, useRef, useEffect, useMemo } from "react";
import {
  useAgent,
  MODEL_ID,
  MODEL_SIZE_GB,
  BANDWIDTH_ESTIMATES,
  calculateDownloadTime,
  DEFAULT_SYSTEM_PROMPT,
  CacheInfo,
  AgentStatus,
  ChatMessage,
} from "./AgentContext";

// Determine which step we're on based on progress text
function getStepFromProgress(progressText: string | undefined): number {
  if (!progressText) return 0;
  const text = progressText.toLowerCase();
  if (text.includes("loading model from cache") || text.includes("fetching param")) {
    return 1; // Downloading
  }
  if (text.includes("compil") || text.includes("shader")) {
    return 2; // Compiling
  }
  if (text.includes("loading gpu") || text.includes("gpu shader") || text.includes("finish loading")) {
    return 3; // Loading to GPU
  }
  return 1; // Default to downloading
}

// Check WebGPU support
function checkWebGPUSupport(): { supported: boolean; reason?: string } {
  if (typeof navigator === "undefined") {
    return { supported: false, reason: "Not running in a browser" };
  }
  if (!navigator.gpu) {
    return { 
      supported: false, 
      reason: "WebGPU is not available. Please use Chrome 113+, Edge 113+, or enable WebGPU in Firefox (about:config → dom.webgpu.enabled)." 
    };
  }
  return { supported: true };
}

export default function Agent() {
  const {
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
  } = useAgent();

  const [inputMessage, setInputMessage] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(systemPrompt);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [webGPUCheck] = useState(() => checkWebGPUSupport());
  const [isClearing, setIsClearing] = useState(false);
  const [showCacheInspector, setShowCacheInspector] = useState(false);
  const [expandedCaches, setExpandedCaches] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Sync edited prompt with system prompt
  useEffect(() => {
    setEditedPrompt(systemPrompt);
  }, [systemPrompt]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || status !== "available") return;

    const message = inputMessage.trim();
    setInputMessage("");
    await sendMessage(message);
  };

  const handleSavePrompt = () => {
    setSystemPrompt(editedPrompt);
    setShowPromptEditor(false);
  };

  const handleResetPrompt = () => {
    setEditedPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  const handleClearCache = async () => {
    if (!window.confirm("This will delete ALL cached data from your browser. You'll need to re-download to use the agent again. Continue?")) {
      return;
    }
    setIsClearing(true);
    try {
      await clearCache();
      setShowCacheInspector(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleInspectCache = async () => {
    setShowCacheInspector(true);
    await inspectCache();
  };

  const toggleCacheExpanded = (cacheName: string) => {
    setExpandedCaches(prev => {
      const next = new Set(prev);
      if (next.has(cacheName)) {
        next.delete(cacheName);
      } else {
        next.add(cacheName);
      }
      return next;
    });
  };

  const handleDeleteCache = async (cacheName: string) => {
    if (!window.confirm(`Delete entire cache "${cacheName}"? This cannot be undone.`)) {
      return;
    }
    await deleteEntireCache(cacheName);
  };

  const handleDeleteCacheItem = async (cacheName: string, url: string) => {
    await deleteCacheItem(cacheName, url);
  };

  // Extract filename from URL for display
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop() || pathname;
      return filename.length > 50 ? filename.substring(0, 47) + "..." : filename;
    } catch {
      return url.length > 50 ? url.substring(0, 47) + "..." : url;
    }
  };

  const formatStorageSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  // Show setup UI when disabled or downloading
  const showSetupUI = status === "disabled" || status === "downloading";

  return (
    <div className="flex flex-col h-full">
      {/* Agent Status Header */}
      <div className={`p-6 ${showSetupUI ? "" : "border-b border-[var(--border-color)]"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">AI Teaching Assistant</h2>
          <StatusBadge status={status} />
        </div>

        {/* Available/Running state controls */}
        {(status === "available" || status === "running") && (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="btn-secondary px-3 py-1.5 rounded text-sm"
              >
                {showPromptEditor ? "Hide Prompt" : "Edit System Prompt"}
              </button>
              <button onClick={clearChat} className="btn-secondary px-3 py-1.5 rounded text-sm">
                Clear Chat
              </button>
              <button onClick={restartAgent} className="btn-secondary px-3 py-1.5 rounded text-sm">
                Restart
              </button>
              <button
                onClick={disableAgent}
                className="px-3 py-1.5 rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Disable
              </button>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-3 py-1.5 rounded text-sm text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors disabled:opacity-50"
              >
                {isClearing ? "Clearing..." : "Clear Cache"}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-[var(--accent-error)]/10 border-2 border-[var(--accent-error)] rounded-lg">
                <div className="flex items-start gap-3">
                  <ErrorIcon />
                  <div>
                    <h4 className="font-semibold text-[var(--accent-error)]">Error</h4>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Setup UI - shown when disabled or downloading */}
      {showSetupUI && (
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
          {/* Step Progress Diagram */}
          <StepProgressDiagram 
            status={status} 
            progressText={downloadProgress?.text}
            progressPercent={downloadProgress?.progress}
          />

          {/* Safe to navigate notice - shown when downloading */}
          {status === "downloading" && (
            <div className="p-4 bg-[var(--accent-success)]/10 border-2 border-[var(--accent-success)] rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--accent-success)] flex-shrink-0 mt-0.5"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <h3 className="font-semibold text-[var(--accent-success)]">Safe to Navigate Away</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Feel free to use the simulator while the model downloads! The download will continue 
                    in the background. The Agent status indicator in the header will turn green when ready.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Banner - only when not yet downloading */}
          {status === "disabled" && (
            <div className="p-4 bg-[var(--accent-warning)]/10 border-2 border-[var(--accent-warning)] rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--accent-warning)] flex-shrink-0 mt-0.5"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                <div>
                  <h3 className="font-semibold text-[var(--accent-warning)]">Large Download Required</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Enabling the AI assistant requires downloading a <strong>{MODEL_SIZE_GB} GB</strong> language model to your browser.
                    This is optional and the simulator works fully without it.
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    Note: The model needs to support function calling, which requires a larger 8B parameter model.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Model Info */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Download Info */}
            <div className="panel p-4">
              <h3 className="panel-title">Model Information</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Model</dt>
                  <dd className="text-[var(--text-primary)] font-mono text-xs">{MODEL_ID}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Size</dt>
                  <dd className="text-[var(--text-primary)]">{MODEL_SIZE_GB} GB</dd>
                </div>
              </dl>

              <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-4 mb-2">
                Estimated Download Time
              </h4>
              <dl className="space-y-1 text-sm">
                {BANDWIDTH_ESTIMATES.map((bw) => (
                  <div key={bw.name} className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">{bw.name}</dt>
                    <dd className="text-[var(--text-primary)]">{calculateDownloadTime(bw.mbps)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Browser & Storage Info */}
            <div className="panel p-4">
              <h3 className="panel-title">Browser Storage</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Browser</dt>
                  <dd className="text-[var(--text-primary)]">{browserInfo.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Cache Support</dt>
                  <dd>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        browserInfo.cacheSupport === "full"
                          ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]"
                          : browserInfo.cacheSupport === "limited"
                            ? "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]"
                            : "bg-[var(--text-muted)]/20 text-[var(--text-muted)]"
                      }`}
                    >
                      {browserInfo.cacheSupport === "full"
                        ? "Full"
                        : browserInfo.cacheSupport === "limited"
                          ? "Limited"
                          : "Unknown"}
                    </span>
                  </dd>
                </div>
                {storageEstimate && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Available</dt>
                      <dd className="text-[var(--text-primary)]">
                        {formatStorageSize(storageEstimate.quota - storageEstimate.usage)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Used</dt>
                      <dd className="text-[var(--text-primary)]">{formatStorageSize(storageEstimate.usage)}</dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="text-xs text-[var(--text-muted)] mt-4">{browserInfo.cacheNotes}</p>
            </div>
          </div>

          {/* WebGPU Warning */}
          {!webGPUCheck.supported && (
            <div className="p-4 bg-[var(--accent-error)]/10 border-2 border-[var(--accent-error)] rounded-lg">
              <div className="flex items-start gap-3">
                <ErrorIcon />
                <div>
                  <h3 className="font-semibold text-[var(--accent-error)]">WebGPU Not Available</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {webGPUCheck.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-[var(--accent-error)]/10 border-2 border-[var(--accent-error)] rounded-lg">
              <div className="flex items-start gap-3">
                <ErrorIcon />
                <div>
                  <h4 className="font-semibold text-[var(--accent-error)]">Error</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enable Button - only when disabled */}
          {status === "disabled" && (
            <div className="space-y-3">
              <button 
                onClick={enableAgent} 
                disabled={!webGPUCheck.supported}
                className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {webGPUCheck.supported 
                  ? `Enable AI Assistant (${MODEL_SIZE_GB} GB download)`
                  : "WebGPU Required"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleInspectCache}
                  disabled={isLoadingCache}
                  className="flex-1 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 border-2 border-[var(--border-color)]"
                >
                  {isLoadingCache ? "Loading..." : "Inspect Cache"}
                </button>
                <button
                  onClick={handleClearCache}
                  disabled={isClearing}
                  className="flex-1 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors disabled:opacity-50 border-2 border-[var(--border-color)]"
                >
                  {isClearing ? "Clearing..." : "Clear All Cache"}
                </button>
              </div>
            </div>
          )}

          {/* Cache Inspector */}
          {showCacheInspector && (
            <CacheInspector
              cacheDetails={cacheDetails}
              isLoading={isLoadingCache}
              expandedCaches={expandedCaches}
              onToggleExpand={toggleCacheExpanded}
              onDeleteCache={handleDeleteCache}
              onDeleteItem={handleDeleteCacheItem}
              onRefresh={inspectCache}
              onClose={() => setShowCacheInspector(false)}
              getFilenameFromUrl={getFilenameFromUrl}
            />
          )}

          {/* What the agent can do - only show when not downloading to reduce clutter */}
          {status === "disabled" && (
          <div className="panel p-4">
            <h3 className="panel-title">What the AI Assistant Can Do</h3>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-success)]">✓</span>
                <span>Explain LC-3B assembly instructions and concepts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-success)]">✓</span>
                <span>Inspect current register values (R0-R7)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-success)]">✓</span>
                <span>Read and analyze your C and assembly code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-success)]">✓</span>
                <span>Check program counter (PC) and condition codes (N, Z, P)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-success)]">✓</span>
                <span>Help debug programs by examining machine state</span>
              </li>
            </ul>
          </div>
          )}
        </div>
      )}

      {/* System Prompt Editor */}
      {showPromptEditor && (status === "available" || status === "running") && (
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">System Prompt</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {(new TextEncoder().encode(editedPrompt).length / 1024).toFixed(1)} KB
              </span>
              <button onClick={handleResetPrompt} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Reset to Default
              </button>
            </div>
          </div>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="input-field w-full h-48 p-3 font-mono text-xs resize-y"
            placeholder="Enter system prompt..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setEditedPrompt(systemPrompt);
                setShowPromptEditor(false);
              }}
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button onClick={handleSavePrompt} className="btn-primary px-3 py-1.5 text-sm">
              Save & Apply
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Changes will apply to new messages. Clear chat to fully reset the conversation context.
          </p>
        </div>
      )}

      {/* Chat Area */}
      {(status === "available" || status === "running") && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  LC-3B Teaching Assistant Ready
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                  Ask questions about your LC-3B code, assembly instructions, register values, or general LC-3B
                  concepts. The assistant can inspect the current state of the simulator.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "What's in the registers?",
                    "Explain the assembly code",
                    "What does ADD do?",
                    "Help me debug",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputMessage(suggestion)}
                      className="px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-colors"
                      style={{ boxShadow: '2px 2px 0 var(--shadow-color)' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <ChatMessageBubble key={idx} message={msg} />
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Generation Stats */}
          {generationStats && (
            <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-muted)]">
                    Tokens: <span className="text-[var(--text-primary)] font-mono">{generationStats.tokensGenerated}</span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Speed: <span className="text-[var(--accent-success)] font-mono font-semibold">{generationStats.tokensPerSecond.toFixed(1)} tok/s</span>
                  </span>
                </div>
                {status === "running" && (
                  <span className="flex items-center gap-1.5 text-[var(--accent-primary)]">
                    <LoadingSpinner className="w-3 h-3" />
                    <span>Generating...</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border-color)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={status === "running" ? "Thinking..." : "Ask about LC-3B..."}
                disabled={status === "running"}
                className="input-field flex-1 px-4 py-3"
              />
              <button
                type="submit"
                disabled={status === "running" || !inputMessage.trim()}
                className="btn-primary px-6 py-3"
              >
                {status === "running" ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner />
                    <span>...</span>
                  </span>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    disabled: {
      bg: "bg-[var(--text-muted)]/20",
      text: "text-[var(--text-muted)]",
      label: "Disabled",
    },
    downloading: {
      bg: "bg-[var(--accent-primary)]/20",
      text: "text-[var(--accent-primary)]",
      label: "Downloading",
    },
    available: {
      bg: "bg-[var(--accent-success)]/20",
      text: "text-[var(--accent-success)]",
      label: "Available",
    },
    running: {
      bg: "bg-[var(--accent-quaternary)]/20",
      text: "text-[var(--accent-quaternary)]",
      label: "Running",
    },
  }[status] || {
    bg: "bg-[var(--text-muted)]/20",
    text: "text-[var(--text-muted)]",
    label: status,
  };

  return (
    <span className={`px-3 py-1 text-sm font-medium flex items-center gap-2 border-2 border-[var(--border-color)] ${config.bg} ${config.text}`}>
      {status === "downloading" && <LoadingSpinner />}
      {config.label}
    </span>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] p-4 border-2 ${
          isUser
            ? "bg-[var(--accent-primary)] text-white border-[var(--border-heavy)]"
            : "bg-[var(--bg-secondary)] border-[var(--border-color)]"
        }`}
        style={{ boxShadow: '3px 3px 0 var(--shadow-color)' }}
      >
        <div className={`text-sm whitespace-pre-wrap ${isUser ? "" : "text-[var(--text-primary)]"}`}>
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--accent-primary)] animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin inline-block ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

interface StepProgressDiagramProps {
  status: AgentStatus;
  progressText?: string;
  progressPercent?: number;
}

function StepProgressDiagram({ status, progressText, progressPercent }: StepProgressDiagramProps) {
  const currentStep = useMemo(() => {
    if (status === "disabled") return 0;
    if (status === "available" || status === "running") return 4;
    return getStepFromProgress(progressText);
  }, [status, progressText]);

  const steps = [
    { id: 1, label: "Download", description: "Fetch model files" },
    { id: 2, label: "Compile", description: "Build GPU shaders" },
    { id: 3, label: "Load GPU", description: "Transfer to graphics card" },
    { id: 4, label: "Ready", description: "Inference can run" },
  ];

  // Don't show when disabled
  if (status === "disabled") return null;

  return (
    <div className="p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-contrast)] rounded-lg">
      {/* Progress bar */}
      {status === "downloading" && progressPercent !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[var(--text-secondary)]">
              {progressText || "Initializing..."}
            </span>
            <span className="text-sm font-mono text-[var(--accent-primary)]">
              {(progressPercent * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${progressPercent * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step circle and content */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isComplete
                      ? "bg-[var(--accent-success)] border-[var(--accent-success)] text-white"
                      : isCurrent
                        ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white"
                        : "bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]"
                  }`}
                >
                  {isComplete ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isCurrent ? (
                    <LoadingSpinner className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.id}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      isComplete
                        ? "text-[var(--accent-success)]"
                        : isCurrent
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.5rem] ${
                    currentStep > step.id
                      ? "bg-[var(--accent-success)]"
                      : "bg-[var(--border-color)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--accent-error)] flex-shrink-0 mt-0.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

interface CacheInspectorProps {
  cacheDetails: CacheInfo[] | null;
  isLoading: boolean;
  expandedCaches: Set<string>;
  onToggleExpand: (cacheName: string) => void;
  onDeleteCache: (cacheName: string) => void;
  onDeleteItem: (cacheName: string, url: string) => void;
  onRefresh: () => void;
  onClose: () => void;
  getFilenameFromUrl: (url: string) => string;
}

function CacheInspector({
  cacheDetails,
  isLoading,
  expandedCaches,
  onToggleExpand,
  onDeleteCache,
  onDeleteItem,
  onRefresh,
  onClose,
  getFilenameFromUrl,
}: CacheInspectorProps) {
  const totalSize = cacheDetails?.reduce((sum, cache) => sum + cache.totalSize, 0) || 0;
  const totalItems = cacheDetails?.reduce((sum, cache) => sum + cache.itemCount, 0) || 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="panel-title mb-0">Browser Cache Inspector</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLoading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading && !cacheDetails ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-6 h-6" />
          <span className="ml-2 text-[var(--text-muted)]">Inspecting cache...</span>
        </div>
      ) : cacheDetails && cacheDetails.length > 0 ? (
        <>
          <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Total cached</span>
              <span className="text-[var(--text-primary)] font-mono">
                {formatBytes(totalSize)} ({totalItems} items)
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cacheDetails.map((cache) => (
              <div
                key={cache.cacheName}
                className="border border-[var(--border-color)] rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  onClick={() => onToggleExpand(cache.cacheName)}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${expandedCaches.has(cache.cacheName) ? "rotate-90" : ""}`}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span className="text-sm font-mono text-[var(--text-primary)]">
                      {cache.cacheName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({cache.itemCount} items)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-[var(--accent-primary)]">
                      {cache.totalSizeFormatted}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCache(cache.cacheName);
                      }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors"
                      title="Delete entire cache"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {expandedCaches.has(cache.cacheName) && (
                  <div className="border-t border-[var(--border-color)] max-h-48 overflow-y-auto">
                    {cache.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors group"
                      >
                        <span
                          className="font-mono text-[var(--text-secondary)] truncate flex-1 mr-2"
                          title={item.url}
                        >
                          {getFilenameFromUrl(item.url)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">{item.sizeFormatted}</span>
                          <button
                            onClick={() => onDeleteItem(cache.cacheName, item.url)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete this item"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No cached data found
        </div>
      )}
    </div>
  );
}