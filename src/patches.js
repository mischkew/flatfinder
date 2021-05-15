/**
 * Patch the console log/ debug/ error functions to prepend the date.
 */
function patchConsole() {
  function patchWithDate(logFunctionName) {
    const originalFunction = console[logFunctionName].bind(console);
    console[logFunctionName] = function () {
      if (arguments.length) {
        originalFunction("[" + new Date().toISOString() + "]", ...arguments);
      }
    };
  }

  function setLogLevel() {
    const levels = ["ERROR", "WARNING", "INFO", "LOG", "DEBUG"];
    const loglevel = process.env.LOG_LEVEL || "DEBUG";
    const activeIndex = levels.indexOf(loglevel);

    if (activeIndex === -1) {
      throw new Error(`Unknown loglevel ${loglevel}`);
    }

    const isActive = (level) => {
      const levelIndex = levels.indexOf(level);
      return activeIndex >= levelIndex;
    };

    for (let level of levels) {
      if (!isActive(level)) {
        console[level.toLowerCase()] = function () {};
      }
    }
  }

  patchWithDate("log");
  patchWithDate("debug");
  patchWithDate("error");

  setLogLevel();
}

module.exports = function applyPatches() {
  patchConsole();
};
