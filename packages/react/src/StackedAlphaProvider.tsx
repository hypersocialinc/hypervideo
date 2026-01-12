'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { getOrCreateResources, setupVertexAttributes, type CachedResources } from './shaderCache';

interface StackedAlphaContextValue {
  /**
   * Gets or creates cached WebGL resources (shaders, program, buffers) for a GL context.
   * Returns cached resources if they exist, otherwise compiles and caches them.
   */
  getResources: (gl: WebGLRenderingContext) => ReturnType<typeof getOrCreateResources>;

  /**
   * Sets up vertex attributes for rendering using cached resources.
   */
  setupAttributes: (gl: WebGLRenderingContext, resources: CachedResources) => void;
}

const StackedAlphaContext = createContext<StackedAlphaContextValue | null>(null);

export interface StackedAlphaProviderProps {
  children: React.ReactNode;
}

/**
 * StackedAlphaProvider - Optimizes multiple StackedAlphaVideo instances
 *
 * Wrapping multiple StackedAlphaVideo components with this provider enables
 * shader and buffer caching, significantly reducing initialization time
 * for the 2nd+ video from ~100-150ms to ~5ms.
 *
 * @example
 * ```tsx
 * <StackedAlphaProvider>
 *   <StackedAlphaVideo src="/happy.mp4" />
 *   <StackedAlphaVideo src="/sad.mp4" />
 *   <StackedAlphaVideo src="/thinking.mp4" />
 * </StackedAlphaProvider>
 * ```
 */
export function StackedAlphaProvider({ children }: StackedAlphaProviderProps) {
  const value = useMemo<StackedAlphaContextValue>(
    () => ({
      getResources: getOrCreateResources,
      setupAttributes: setupVertexAttributes,
    }),
    []
  );

  return (
    <StackedAlphaContext.Provider value={value}>
      {children}
    </StackedAlphaContext.Provider>
  );
}

/**
 * Hook to access the StackedAlpha context for shader caching.
 * Returns null if not wrapped in a StackedAlphaProvider.
 */
export function useStackedAlphaContext(): StackedAlphaContextValue | null {
  return useContext(StackedAlphaContext);
}

export default StackedAlphaProvider;
