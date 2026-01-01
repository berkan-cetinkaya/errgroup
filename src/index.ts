import { Context } from "go-like-ctx";

type TaskFn = (ctx: Context) => Promise<unknown> | unknown;

type ErrGroup = {
  go: (fn: TaskFn) => void;
  wait: () => Promise<void>;
  waitSafe: () => Promise<{ ok: true } | { ok: false; error: Error }>;
};

type ErrGroupOptions = {
  onError?: (err: Error) => void;
};

class ErrGroupError extends Error {
  readonly code: "ERRGROUP_USAGE" | "ERRGROUP_TASK";

  constructor({
    message,
    code
  }: {
    message: string;
    code: "ERRGROUP_USAGE" | "ERRGROUP_TASK";
  }) {
    super(message);
    this.name = "ErrGroupError";
    this.code = code;
  }
}

export function errgroup(parent: Context, opts: ErrGroupOptions = {}): ErrGroup {
  const ctx = parent.withCancel();
  const tasks: Promise<void>[] = [];
  let firstErr: unknown = null;
  let waiting = false;
  let onErrorCalled = false;

  const run = async (fn: TaskFn) => {
    try {
      await fn(ctx);
    } catch (err) {
      if (firstErr === null) {
        const normalizedErr =
          err instanceof Error
            ? err
            : new ErrGroupError({
                message: "errgroup: task failed",
                code: "ERRGROUP_TASK"
              });
        firstErr = normalizedErr;
        if (opts.onError && !onErrorCalled) {
          onErrorCalled = true;
          opts.onError(normalizedErr);
        }
        ctx.cancel();
      }
    }
  };

  return {
    go(fn) {
      if (waiting) {
        throw new ErrGroupError({
          message: "errgroup: go called after wait",
          code: "ERRGROUP_USAGE"
        });
      }

      const task = Promise.resolve().then(() => run(fn));
      tasks.push(task);
    },
    async wait() {
      const err = await finalize();
      if (err !== null) {
        throw err;
      }
    },
    async waitSafe() {
      const err = await finalize();
      if (err !== null) {
        return { ok: false, error: err };
      }
      return { ok: true };
    }
  };

  async function finalize(): Promise<Error | null> {
    waiting = true;
    await Promise.allSettled(tasks);
    if (firstErr !== null) {
      return firstErr as Error;
    }
    return null;
  }
}
