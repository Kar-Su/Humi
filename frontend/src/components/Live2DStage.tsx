import type { Application } from "@pixi/app";
import { useEffect, useRef, useState } from "react";
import { loadCubismCore } from "../lib/cubismCore";
import { fitModelToPanel } from "../lib/fitModel";

/** A model that neither resolves nor rejects would otherwise hang the avatar forever. */
const LOAD_TIMEOUT_MS = 20_000;

/** Breathing room around the model so it never touches the panel edges. */
const FIT_PADDING = 0.94;

export interface Live2DStageProps {
  modelUrl: string;
  onFailure: (message: string) => void;
}

export function Live2DStage({ modelUrl, onFailure }: Live2DStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  // Held in a ref so an inline callback from the parent cannot retrigger the effect.
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app: Application | null = null;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;

    const fail = (message: string) => {
      if (disposed) return;
      setReady(false);
      setDetail(message);
      onFailureRef.current(message);
    };

    const boot = async () => {
      // Must settle first: pixi-live2d-display/cubism4 throws at module evaluation time
      // when the Core global is missing, and a static import would take the whole app
      // down instead of falling back to the emoji avatar.
      await loadCubismCore();
      if (disposed) return;

      // Every Pixi piece is pulled in here rather than at module scope so the default
      // emoji avatar never downloads the renderer.
      const [appModule, coreModule, extModule, tickerModule, live2dModule] = await Promise.all([
        import("@pixi/app"),
        import("@pixi/core"),
        import("@pixi/extensions"),
        import("@pixi/ticker"),
        import("pixi-live2d-display/cubism4"),
      ]);
      if (disposed) return;

      live2dModule.Live2DModel.registerTicker(tickerModule.Ticker);
      extModule.extensions.add(tickerModule.TickerPlugin);
      // The model draws through its own pipeline, so the batch renderer only matters once
      // a plain sprite joins the stage. InteractionManager stays out so pointer handling
      // can be driven manually once eye tracking lands.
      extModule.extensions.add(coreModule.BatchRenderer);

      app = new appModule.Application({
        backgroundAlpha: 0,
        preserveDrawingBuffer: true,
        autoDensity: true,
        resizeTo: host,
        resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      });

      const pixi = app;
      host.appendChild(pixi.view as HTMLCanvasElement);

      // autoUpdate is off on purpose: it would bind the model to Ticker.shared, which
      // nothing in this app starts, so the model would load and then never paint.
      const model = new live2dModule.Live2DModel({ autoUpdate: false, autoInteract: false });

      const timeout = new Promise<never>((_resolve, reject) => {
        loadTimer = setTimeout(
          () =>
            reject(
              new Error(
                `Model Live2D dari ${modelUrl} tidak selesai dimuat dalam ${LOAD_TIMEOUT_MS / 1000} detik.`,
              ),
            ),
          LOAD_TIMEOUT_MS,
        );
      });

      // Resolves only after texture and model are both loaded, so the model is safe to
      // add to the stage afterwards.
      try {
        await Promise.race([
          live2dModule.Live2DFactory.setupLive2DModel(model, modelUrl, { autoInteract: false }),
          timeout,
        ]);
      } finally {
        clearTimeout(loadTimer);
        loadTimer = undefined;
      }
      if (disposed) {
        model.destroy();
        return;
      }

      pixi.stage.addChild(model);

      // Captured while the scale is still 1. The size a live model reports already folds
      // in its current scale, so re-reading it after each fit would compound the scale
      // on every resize instead of recomputing from the authored size.
      const authored = { width: model.width, height: model.height };

      const fit = () => {
        const placed = fitModelToPanel(
          { width: host.clientWidth, height: host.clientHeight },
          authored,
          FIT_PADDING,
        );
        if (!placed) return;

        model.scale.set(placed.scale);
        model.x = placed.x;
        model.y = placed.y;
      };

      fit();
      observer = new ResizeObserver(fit);
      observer.observe(host);

      // Live2D draws inside update(), not from the scene graph, so the update has to be
      // pumped from a running ticker. One clock for update and render keeps motion in step.
      pixi.ticker.remove(pixi.render, pixi);
      pixi.ticker.add(() => {
        try {
          model.update(pixi.ticker.deltaMS);
          pixi.render();
        } catch (error) {
          pixi.ticker.stop();
          console.error("[Live2D] render gagal, ticker dihentikan", error);
        }
      });

      setReady(true);
      setDetail(null);
    };

    void boot().catch((error: unknown) => {
      fail(error instanceof Error ? error.message : String(error));
    });

    return () => {
      disposed = true;
      clearTimeout(loadTimer);
      observer?.disconnect();
      // removeView also detaches the canvas and releases the WebGL context. The texture
      // cache is left alone so a StrictMode remount can reuse the same cached textures.
      app?.destroy(true, { children: true, texture: false, baseTexture: false });
      app = null;
    };
  }, [modelUrl]);

  // No height of its own: the parent panel owns the box, and Pixi's resizeTo needs a host
  // that is already laid out or fitModelToPanel measures zero.
  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" />
      {!ready && (
        <p className="absolute inset-x-3 bottom-3 rounded-sm bg-canvas/80 px-3 py-2 text-center text-caption text-ink-muted backdrop-blur-sm">
          {detail ?? "Memuat avatar Live2D..."}
        </p>
      )}
    </div>
  );
}
