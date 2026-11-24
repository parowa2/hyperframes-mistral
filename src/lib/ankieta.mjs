import readline from "node:readline";

export function stworzAnkiete() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY === true,
  });
  const lines = [];
  const waiters = [];
  rl.on("line", (l) => {
    if (waiters.length) waiters.shift()(l);
    else lines.push(l);
  });
  return {
    pytaj(q, domyslne = "") {
      process.stdout.write(`${q}${domyslne ? ` [${domyslne}]` : ""}: `);
      if (lines.length) return Promise.resolve(lines.shift().trim() || domyslne);
      return new Promise((res) => waiters.push((l) => res(l.trim() || domyslne)));
    },
    zamknij() {
      rl.close();
    },
  };
}
