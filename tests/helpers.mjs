// Starts `wrangler dev` on a free port and stops exactly that process.
import { spawn } from "node:child_process";
import net from "node:net";

export async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startDev() {
  const port = await freePort();
  const proc = spawn("npx", ["wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--show-interactive-dev-session=false"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`wrangler dev exited:\n${log}`);
    try {
      await fetch(base, { redirect: "manual" });
      return { base, stop: () => stop(proc), log: () => log };
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  stop(proc);
  throw new Error(`wrangler dev did not start in 60s:\n${log}`);
}

function stop(proc) {
  // Kill the process group we created (npx -> wrangler -> workerd), nothing else.
  try { process.kill(-proc.pid, "SIGTERM"); } catch (e) { if (e.code !== "ESRCH") console.error(e); }
}
