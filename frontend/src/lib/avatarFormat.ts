export const AVATAR_FORMATS = ["live2d", "emoji"] as const;

export type AvatarFormat = (typeof AVATAR_FORMATS)[number];

/**
 * Avatar starts as emoji so a fresh checkout renders something before the
 * licensed Live2D assets are downloaded locally.
 */
export const DEFAULT_AVATAR_FORMAT: AvatarFormat = "emoji";

export const DEFAULT_LIVE2D_MODEL_URL = "/live2d/hiyori/Hiyori.model3.json";

export function isAvatarFormat(value: string): value is AvatarFormat {
  return (AVATAR_FORMATS as readonly string[]).includes(value);
}

export function parseAvatarFormat(raw: string | null | undefined): AvatarFormat {
  if (typeof raw !== "string") return DEFAULT_AVATAR_FORMAT;
  const value = raw.trim().toLowerCase();
  return isAvatarFormat(value) ? value : DEFAULT_AVATAR_FORMAT;
}

export function resolveAvatarFormat(env: ImportMetaEnv): AvatarFormat {
  return parseAvatarFormat(env.VITE_AVATAR_FORMAT);
}

export function resolveLive2dModelUrl(env: ImportMetaEnv): string {
  const raw = env.VITE_LIVE2D_MODEL_URL?.trim();
  return raw ? raw : DEFAULT_LIVE2D_MODEL_URL;
}
