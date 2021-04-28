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

  patchWithDate("log");
  patchWithDate("debug");
  patchWithDate("error");
}
patchConsole();

const flatfinder = require("./flatfinder");
flatfinder(!!process.env.DRY_RUN);
