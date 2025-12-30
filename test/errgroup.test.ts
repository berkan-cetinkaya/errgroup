import { describe, it, expect } from "vitest";
import { errgroup } from "../src/index.js";
import { background } from "go-like-ctx";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("errgroup", () => {
  it("wait resolves when all tasks succeed", async () => {
    const g = errgroup(background());

    g.go(async () => {
      await delay(10);
    });

    g.go(() => {
      // synchronous success
    });

    await g.wait();
  });

  it("wait rejects with the first error", async () => {
    const g = errgroup(background());

    const first = new Error("first");
    const second = new Error("second");

    g.go(async () => {
      await delay(5);
      throw first;
    });

    g.go(async () => {
      await delay(20);
      throw second;
    });

    await expect(g.wait()).rejects.toBe(first);
  });

  it("uses a fallback error when a task throws undefined", async () => {
    const g = errgroup(background());

    g.go(() => {
      throw undefined;
    });

    await expect(g.wait()).rejects.toMatchObject({
      name: "ErrGroupError",
      code: "ERRGROUP_TASK"
    });
  });

  it("go after wait throws", async () => {
    const g = errgroup(background());

    await g.wait();

    let thrown: unknown;
    try {
      g.go(() => {});
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toMatchObject({
      name: "ErrGroupError",
      code: "ERRGROUP_USAGE",
      message: "errgroup: go called after wait"
    });
  });

  it("calls onError once with the first error", async () => {
    const errors: Error[] = [];
    const g = errgroup(background(), {
      onError(err) {
        errors.push(err);
      }
    });

    const first = new Error("first");
    const second = new Error("second");

    g.go(async () => {
      await delay(5);
      throw first;
    });

    g.go(async () => {
      await delay(10);
      throw second;
    });

    await expect(g.wait()).rejects.toBe(first);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(first);
  });

  it("calls onError with a fallback error when the error is not an Error", async () => {
    const errors: Error[] = [];
    const g = errgroup(background(), {
      onError(err) {
        errors.push(err);
      }
    });

    g.go(() => {
      throw undefined;
    });

    await expect(g.wait()).rejects.toMatchObject({
      name: "ErrGroupError",
      code: "ERRGROUP_TASK"
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      name: "ErrGroupError",
      code: "ERRGROUP_TASK"
    });
  });
});
