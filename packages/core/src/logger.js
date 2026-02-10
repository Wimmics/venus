export function truncateLogMessage(message, maxLength = 420) {
  const text = typeof message === "string" ? message : String(message);
  if (!Number.isFinite(maxLength) || maxLength <= 0 || text.length <= maxLength) {
    return text;
  }
  const truncatedChars = text.length - maxLength;
  return `${text.slice(0, maxLength)}... [${truncatedChars} chars truncated]`;
}

export function createLogger(scope, { debug = false, level = "info", maxMessageLength = 420 } = {}) {
  const levels = { debug: 10, info: 20, warn: 30, error: 40 };
  const min = levels[level] ?? levels.info;

  function shouldLog(lvl) {
    const sev = levels[lvl] ?? levels.info;

    // If debug flag is true, allow debug regardless of min threshold.
    if (lvl === "debug" && debug) return true;

    // Otherwise respect the threshold.
    return sev >= min;
  }

  function line(lvl, message, meta) {
    const safeMessage = truncateLogMessage(message, maxMessageLength);
    const prefix = `[${scope}] ${lvl.toUpperCase()}: ${safeMessage}`;
    if (meta == null) return prefix;
    try {
      return `${prefix} ${JSON.stringify(meta)}`;
    } catch {
      return `${prefix} {"meta":"[unserializable]"}`;
    }
  }

  return {
    debug(message, meta) {
      if (shouldLog("debug")) console.debug(line("debug", message, meta));
    },
    info(message, meta) {
      if (shouldLog("info")) console.info(line("info", message, meta));
    },
    warn(message, meta) {
      if (shouldLog("warn")) console.warn(line("warn", message, meta));
    },
    error(message, meta) {
      if (shouldLog("error")) console.error(line("error", message, meta));
    }
  };
}
