type Level = "debug" | "info" | "warn" | "error";

const PREFIX = "[humi]";

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

function log(level: Level, tag: string, ...args: unknown[]) {
  const line = `${ts()} ${PREFIX}[${tag}]`;
  if (level === "error") console.error(line, ...args);
  else if (level === "warn") console.warn(line, ...args);
  else if (level === "debug") console.debug(line, ...args);
  else console.log(line, ...args);
}

export const logger = {
  ws: {
    info: (...a: unknown[]) => log("info", "ws", ...a),
    warn: (...a: unknown[]) => log("warn", "ws", ...a),
    error: (...a: unknown[]) => log("error", "ws", ...a),
    debug: (...a: unknown[]) => log("debug", "ws", ...a),
  },
  audio: {
    info: (...a: unknown[]) => log("info", "audio", ...a),
    warn: (...a: unknown[]) => log("warn", "audio", ...a),
    error: (...a: unknown[]) => log("error", "audio", ...a),
    debug: (...a: unknown[]) => log("debug", "audio", ...a),
  },
  app: {
    info: (...a: unknown[]) => log("info", "app", ...a),
    warn: (...a: unknown[]) => log("warn", "app", ...a),
    error: (...a: unknown[]) => log("error", "app", ...a),
  },
};
