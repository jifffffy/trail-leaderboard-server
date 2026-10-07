import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";

/**
 * Walk up from `start` looking for the workspace root (marked by
 * `pnpm-workspace.yaml`). Falls back to `start` if no marker is found.
 */
function findWorkspaceRoot(start: string): string {
  let dir = start;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return start;
    }
    dir = parent;
  }
}

/**
 * Absolute path to the data directory based on the environment variable
 * `LEADERBOARD_DATA_DIR` or the provided data directory or fallback to `./data`
 * relative to the workspace root.
 *
 * The workspace root is taken from `WORKSPACE_ROOT` when set, otherwise it is
 * discovered by walking up from the current working directory until a
 * `pnpm-workspace.yaml` is found.
 *
 * @param dataDir - The data directory to use, if not provided, the environment
 * variable `LEADERBOARD_DATA_DIR` will be used
 * @returns The absolute path to the data directory
 */
export const getDataDir = (dataDir?: string) => {
  const workspaceRoot =
    process.env.WORKSPACE_ROOT ?? findWorkspaceRoot(process.cwd());

  const raw = dataDir || process.env.LEADERBOARD_DATA_DIR;
  if (!raw) {
    return path.resolve(workspaceRoot, "./data");
  }

  let p = raw;

  // Expand ~
  if (p.startsWith("~")) {
    p = path.join(homedir(), p.slice(1));
  }

  // Absolute path → normalize and return
  if (path.isAbsolute(p)) {
    return path.resolve(p);
  }

  // Relative path → resolve against workspace root
  return path.resolve(workspaceRoot, p);
};
