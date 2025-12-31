# errgroup

Structured concurrency for Node.js inspired by Go's errgroup, built on top of
[go-like-ctx](https://www.npmjs.com/package/go-like-ctx). It does not replace
ctx; it orchestrates it.

## Install

```sh
npm install errgroup go-like-ctx
```

## Usage

```js
import { errgroup } from "errgroup";
import { background } from "go-like-ctx";

const ctx = background().withTimeout(5_000);
const g = errgroup(ctx, {
  onError(err) {
    console.error("register failed", err);
  }
});

g.go(async (ctx) => {
  await taskA(ctx);
});

g.go(async (ctx) => {
  await taskB(ctx);
});

try {
  await g.wait();
} finally {
  ctx.cancel();
}
```

## Behavior

- Explicit context passing only.
- First error wins and cancels the shared context.
- Optional `onError` runs exactly once with the first error.
- Other tasks should observe ctx and exit early.
- `wait()` resolves after all tasks settle, then rethrows the first error.
- `go()` after `wait()` throws a usage error.

## Example: Register endpoint

See `examples/register.js` for a more complete flow that verifies captcha, saves
the user, subscribes them to email, sends a confirmation, and publishes
analytics under a single context.

## Why errgroup?

- One place to wait for all concurrent work.
- First error cancels the whole group to avoid wasted work.
- Forces structured, explicit context propagation (no globals).
- Keeps error handling consistent and predictable.

## Development

```sh
npm install
npm run build
npm test
npm run test:watch
```
