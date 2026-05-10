/**
 * BlueLens Structured Logging Utility
 * Provides consistent logging with levels, timestamps, and optional file output
 * @module logger
 */

const fs = require("fs");

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LOG_LEVEL_NAMES = ["DEBUG", "INFO", "WARN", "ERROR"];

/**
 * Creates a logger instance with optional file output
 * @param {Object} options - Logger configuration
 * @param {string} [options.level="INFO"] - Minimum log level (DEBUG, INFO, WARN, ERROR)
 * @param {string|null} [options.logFile=null] - Optional log file path
 * @param {boolean} [options.console=true] - Whether to also log to console
 * @param {string} [options.scope="BlueLens"] - Log scope/component name
 * @returns {Object} Logger instance with debug, info, warn, error methods
 */
function createLogger(options = {}) {
  const config = {
    level: options.level || "INFO",
    logFile: options.logFile || null,
    console: options.console !== false,
    scope: options.scope || "BlueLens",
  };

  const minLevel = LOG_LEVELS[config.level] || LOG_LEVELS.INFO;

  /**
   * Formats a log entry with timestamp and metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   * @returns {Object} Formatted log entry
   */
  function formatLogEntry(level, message, meta = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      scope: config.scope,
      message,
    };

    if (meta) {
      entry.meta = meta;
    }

    return entry;
  }

  /**
   * Writes a log entry to file and/or console
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  function log(level, message, meta = null) {
    const levelNum = LOG_LEVELS[level];
    if (levelNum < minLevel) return;

    const entry = formatLogEntry(level, message, meta);

    // Console output
    if (config.console) {
      const consoleMsg = `[${entry.timestamp}] [${entry.level}] [${entry.scope}] ${entry.message}`;
      switch (level) {
        case "ERROR":
          console.error(consoleMsg, meta || "");
          break;
        case "WARN":
          console.warn(consoleMsg, meta || "");
          break;
        case "DEBUG":
          console.debug(consoleMsg, meta || "");
          break;
        default:
          console.log(consoleMsg, meta || "");
      }
    }

    // File output
    if (config.logFile) {
      try {
        const logLine = JSON.stringify(entry) + "\n";
        fs.appendFileSync(config.logFile, logLine, "utf8");
      } catch (error) {
        console.error(`[Logger] Failed to write to log file: ${error.message}`);
      }
    }
  }

  return {
    /**
     * Log debug message (level 0)
     * @param {string} message - Debug message
     * @param {Object} [meta] - Additional metadata
     */
    debug: (message, meta) => log("DEBUG", message, meta),

    /**
     * Log info message (level 1)
     * @param {string} message - Info message
     * @param {Object} [meta] - Additional metadata
     */
    info: (message, meta) => log("INFO", message, meta),

    /**
     * Log warning message (level 2)
     * @param {string} message - Warning message
     * @param {Object} [meta] - Additional metadata
     */
    warn: (message, meta) => log("WARN", message, meta),

    /**
     * Log error message (level 3)
     * @param {string} message - Error message
     * @param {Object} [meta] - Additional metadata or error object
     */
    error: (message, meta) => log("ERROR", message, meta),

    /**
     * Create a child logger with a different scope
     * @param {string} scope - New scope name
     * @returns {Object} New logger instance
     */
    child: (scope) => createLogger({ ...config, scope: `${config.scope}:${scope}` }),
  };
}

/**
 * Default logger instance for the BlueLens server
 * Logs to console and optionally to file if BLUELENS_LOG_FILE env var is set
 */
const defaultLogger = createLogger({
  level: process.env.BLUELENS_LOG_LEVEL || "INFO",
  logFile: process.env.BLUELENS_LOG_FILE || null,
  console: true,
  scope: "BlueLens",
});

module.exports = {
  createLogger,
  defaultLogger,
  LOG_LEVELS,
  LOG_LEVEL_NAMES,
};
