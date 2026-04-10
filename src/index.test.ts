import { describe, it, expect, mock, afterAll } from "bun:test";

// Static imports of real modules for afterAll restoration
import * as realChecker from "./checker.ts";

afterAll(() => {
  mock.module("./checker.ts", () => realChecker);
});

// Minimal PluginInput stub — only what the plugin uses
function makeInput(spawnCheckFn: (...args: any[]) => Promise<void>) {
  return {
    client: {} as any,
    directory: "/test/dir",
    project: {} as any,
    worktree: "/test/dir",
    serverUrl: new URL("http://localhost:3000"),
    $: {} as any,
    _spawnCheck: spawnCheckFn,
  };
}

describe("SkillsNotifierPlugin", () => {
  it("session.created hook returns before spawnCheck resolves", async () => {
    let resolveSpawn!: () => void;
    const spawnStarted = new Promise<void>((r) => {
      resolveSpawn = r;
    });
    let spawnResolved = false;

    const neverResolving = new Promise<void>((resolve) => {
      // will be resolved manually after hook returns
      spawnStarted.then(() => {
        spawnResolved = false;
        // don't resolve — simulating a long-running operation
      });
    });

    mock.module("./checker.ts", () => ({
      ...realChecker,
      spawnCheck: (_client: any, _dir: any) => {
        resolveSpawn();
        return neverResolving;
      },
    }));

    // Re-import to pick up the mock
    const { SkillsNotifierPlugin } = await import("./index.ts");
    const hooks = await SkillsNotifierPlugin({ client: {} as any, directory: "/test/dir" } as any);

    const hookPromise = hooks.event!({ event: { type: "session.created" } as any });

    // Wait for spawnCheck to be called
    await spawnStarted;

    // The hook should have already resolved (it's fire-and-forget)
    let hookSettled = false;
    await Promise.race([
      hookPromise.then(() => { hookSettled = true; }),
      Promise.resolve(), // microtask to check
    ]);
    await hookPromise; // should already be done
    expect(spawnResolved).toBe(false); // spawnCheck still pending
  });

  it("errors from spawnCheck do not cause the hook to throw", async () => {
    mock.module("./checker.ts", () => ({
      ...realChecker,
      spawnCheck: async (_client: any, _dir: any) => {
        throw new Error("network failure");
      },
    }));

    const { SkillsNotifierPlugin } = await import("./index.ts");
    const hooks = await SkillsNotifierPlugin({ client: {} as any, directory: "/test/dir" } as any);

    // The hook itself should not throw
    await expect(
      hooks.event!({ event: { type: "session.created" } as any })
    ).resolves.toBeUndefined();

    // Give the rejection a tick to be swallowed
    await new Promise((r) => setTimeout(r, 10));
  });

  it("non-session.created events do not call spawnCheck", async () => {
    let called = false;
    mock.module("./checker.ts", () => ({
      ...realChecker,
      spawnCheck: async () => { called = true; },
    }));

    const { SkillsNotifierPlugin } = await import("./index.ts");
    const hooks = await SkillsNotifierPlugin({ client: {} as any, directory: "/test/dir" } as any);

    await hooks.event!({ event: { type: "session.updated" } as any });
    expect(called).toBe(false);
  });
});
