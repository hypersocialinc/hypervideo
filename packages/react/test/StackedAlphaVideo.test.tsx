import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StackedAlphaVideo } from '../src/StackedAlphaVideo';

vi.mock('../src/shaderCache', () => ({
  getOrCreateResources: vi.fn(() => ({ program: {} })),
  setupVertexAttributes: vi.fn(),
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  observedElement: Element | null = null;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn((element: Element) => {
    this.observedElement = element;
  });
  readonly takeRecords = vi.fn(() => []);
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    const target = this.observedElement ?? document.createElement('div');
    this.callback(
      [{ isIntersecting, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }

  static reset() {
    MockIntersectionObserver.instances = [];
  }
}

function createWebGLContextMock() {
  return {
    BLEND: 0x0be2,
    CLAMP_TO_EDGE: 0x812f,
    COLOR_BUFFER_BIT: 0x4000,
    LINEAR: 0x2601,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    RGBA: 0x1908,
    SRC_ALPHA: 0x0302,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TRIANGLES: 0x0004,
    UNSIGNED_BYTE: 0x1401,
    bindTexture: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    createTexture: vi.fn(() => ({})),
    drawArrays: vi.fn(),
    enable: vi.fn(),
    getExtension: vi.fn(() => null),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    texSubImage2D: vi.fn(),
    useProgram: vi.fn(),
    viewport: vi.fn(),
  };
}

function createMockVideo(options?: { paused?: boolean }) {
  const video = document.createElement('video');
  let paused = options?.paused ?? true;
  const play = vi.fn().mockImplementation(() => {
    paused = false;
    return Promise.resolve();
  });
  const pause = vi.fn().mockImplementation(() => {
    paused = true;
  });

  Object.defineProperties(video, {
    ended: {
      configurable: true,
      get: () => false,
    },
    pause: {
      configurable: true,
      value: pause,
    },
    paused: {
      configurable: true,
      get: () => paused,
    },
    play: {
      configurable: true,
      value: play,
    },
    readyState: {
      configurable: true,
      get: () => 2,
    },
    videoHeight: {
      configurable: true,
      get: () => 720,
    },
    videoWidth: {
      configurable: true,
      get: () => 720,
    },
  });

  return { pause, play, video };
}

describe('StackedAlphaVideo', () => {
  beforeEach(() => {
    MockIntersectionObserver.reset();
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return createWebGLContextMock() as unknown as RenderingContext;
      }

      return null;
    });
  });

  it('pauses and resumes playback when the canvas leaves and re-enters the viewport', () => {
    const { pause, play, video } = createMockVideo({ paused: false });
    const { container } = render(<StackedAlphaVideo src="/mascot.mp4" videoElement={video} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);

    const observer = MockIntersectionObserver.instances[0];
    const canvas = container.querySelector('canvas');

    expect(canvas).not.toBeNull();
    expect(observer.observe).toHaveBeenCalledWith(canvas);
    expect(play).not.toHaveBeenCalled();

    observer.trigger(false);

    expect(pause).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();

    observer.trigger(true);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('skips IntersectionObserver setup when offscreen pausing is disabled', () => {
    const { pause, play, video } = createMockVideo({ paused: false });
    render(
      <StackedAlphaVideo
        src="/mascot.mp4"
        videoElement={video}
        pauseWhenOffscreen={false}
      />
    );

    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(pause).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });
});
