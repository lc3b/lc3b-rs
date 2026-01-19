// WebGPU type declarations

interface GPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

interface GPUAdapter {
  readonly info: GPUAdapterInfo;
  readonly features: ReadonlySet<string>;
  readonly limits: Record<string, number>;
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDeviceDescriptor {
  requiredFeatures?: string[];
  requiredLimits?: Record<string, number>;
}

interface GPUDevice {
  readonly features: ReadonlySet<string>;
  readonly limits: Record<string, number>;
  readonly queue: GPUQueue;
  destroy(): void;
}

interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
}

interface GPUCommandBuffer {}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): string;
}

interface GPURequestAdapterOptions {
  powerPreference?: "low-power" | "high-performance";
  forceFallbackAdapter?: boolean;
}

interface Navigator {
  readonly gpu?: GPU;
}