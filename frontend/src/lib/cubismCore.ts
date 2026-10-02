/**
 * The Cubism Core runtime ships as a plain script that publishes a single
 * `Live2DCubismCore` global. It is licensed separately from this repository, so
 * it is never committed and must be fetched at runtime.
 *
 * `pixi-live2d-display/cubism4` throws at module evaluation time when that global
 * is missing, so this loader has to settle before the library is imported.
 */
export const CUBISM_CORE_URL = "/assets/js/live2dcubismcore.min.js";

export interface CubismCoreScope {
  Live2DCubismCore?: unknown;
}

export type CubismCoreScriptHost = Pick<Document, "createElement" | "head">;

export function isCubismCorePresent(
  scope: CubismCoreScope = globalThis as CubismCoreScope,
): boolean {
  return Boolean(scope.Live2DCubismCore);
}

export function loadCubismCore(
  url: string = CUBISM_CORE_URL,
  doc: CubismCoreScriptHost = document,
  scope: CubismCoreScope = globalThis as CubismCoreScope,
): Promise<void> {
  if (isCubismCorePresent(scope)) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = url;
    script.async = false;

    script.addEventListener("load", () => {
      if (isCubismCorePresent(scope)) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Cubism Core dimuat dari ${url} tetapi global window.Live2DCubismCore tidak ada. Pastikan berkas itu live2dcubismcore.min.js dari SDK resmi Live2D.`,
        ),
      );
    });

    script.addEventListener("error", () => {
      reject(
        new Error(
          `Gagal memuat Cubism Core dari ${url}. Unduh live2dcubismcore.min.js dari SDK resmi Live2D lalu taruh di frontend/public${url}.`,
        ),
      );
    });

    doc.head.appendChild(script);
  });
}
