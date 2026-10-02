export interface PanelSize {
  width: number;
  height: number;
}

export interface ModelPlacement {
  scale: number;
  x: number;
  y: number;
}

/**
 * Live2D models load at their authored pixel size anchored at the origin, which is
 * usually far larger than the panel they belong in. Scale the model down to fit and
 * centre what is left.
 *
 * `authored` must be the model's size captured while its scale is still 1. The size
 * reported by a live model already folds in its current scale, so re-reading it after
 * each fit compounds the scale and grows the avatar without bound.
 */
export function fitModelToPanel(
  panel: PanelSize,
  authored: PanelSize,
  padding = 1,
): ModelPlacement | null {
  if (panel.width <= 0 || panel.height <= 0) return null;
  if (authored.width <= 0 || authored.height <= 0) return null;

  const scale = Math.min(panel.width / authored.width, panel.height / authored.height) * padding;

  return {
    scale,
    x: (panel.width - authored.width * scale) / 2,
    y: (panel.height - authored.height * scale) / 2,
  };
}
