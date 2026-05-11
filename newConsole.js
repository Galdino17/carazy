export default function setupConsoleLogger() {
  const originalLog = console.log;

  console.log = (...args) => {
    const stackLine = new Error().stack?.split("\n")[2];

    let location = "unknown";

    if (stackLine) {
      const path = stackLine
        .split("(")[1]
        ?.split(")")[0]
        ?.replace("file:///", "")
        ?.replace(/\\/g, "/");

      if (path) {
        const parts = path.split("/");

        location = "/" + parts.slice(-2).join("/");
      }
    }

    // args.shift();

    originalLog(`[${location}]`, ...args);
  };
}
