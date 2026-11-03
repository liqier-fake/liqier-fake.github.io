export interface RenderCapabilities {
  width: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  dataSaver: boolean;
  /** CPU-emulated WebGL (SwiftShader, llvmpipe, Basic Render): no GPU acceleration. */
  softwareRenderer?: boolean;
}

export interface QualityProfile {
  tier: 'low' | 'medium' | 'high';
  pixelRatio: number;
  particleCount: number;
  shadows: boolean;
  reflections: boolean;
  postprocessing: boolean;
}

/** True when WebGL is being emulated on the CPU, where the full scene would crawl. */
export function isSoftwareRenderer(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|basic render|software/i.test(name);
}

export function selectQualityProfile(capabilities: RenderCapabilities): QualityProfile {
  if (capabilities.dataSaver || capabilities.softwareRenderer || capabilities.hardwareConcurrency <= 2) {
    return {
      tier: 'low',
      pixelRatio: 1,
      particleCount: 200,
      shadows: false,
      reflections: false,
      postprocessing: false,
    };
  }

  if (capabilities.width < 768 || capabilities.hardwareConcurrency <= 4) {
    return {
      tier: 'medium',
      pixelRatio: Math.min(1.5, capabilities.devicePixelRatio),
      particleCount: 700,
      shadows: false,
      reflections: true,
      postprocessing: false,
    };
  }

  return {
    tier: 'high',
    pixelRatio: Math.min(2, capabilities.devicePixelRatio),
    particleCount: 1600,
    shadows: true,
    reflections: true,
    postprocessing: true,
  };
}
