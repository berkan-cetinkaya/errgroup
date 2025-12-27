import { errgroup } from "errgroup";
import { Context, background } from "go-like-ctx";
import { pathToFileURL } from "node:url";

type RegisterInput = {
  email: string;
  password: string;
  captchaToken: string;
};

type RegisterResult = {
  userId: string;
};

export async function registerEndpoint(
  input: RegisterInput
): Promise<RegisterResult> {
  const ctx = background().withTimeout(10_000);
  try {
    console.log("register: start");
    return await register(ctx, input);
  } finally {
    console.log("register: end");
    ctx.cancel();
  }
}

async function register(ctx: Context, input: RegisterInput): Promise<RegisterResult> {
  ctx.throwIfCancelled();
  console.log("register: verify captcha");
  await verifyCaptcha(ctx, input.captchaToken);

  console.log("register: create user");
  const userId = await createUser(ctx, input);

  console.log("register: fan-out tasks");
  const g = errgroup(ctx);
  g.go((ctx) => subscribeEmail(ctx, userId, input.email));
  g.go((ctx) => sendConfirmation(ctx, userId, input.email));
  g.go((ctx) => publishAnalytics(ctx, userId));

  console.log("register: wait for tasks");
  await g.wait();

  console.log("register: done");
  return { userId };
}

async function verifyCaptcha(ctx: Context, token: string): Promise<void> {
  ctx.throwIfCancelled();
  console.log("captcha: verify");
  await delay(20);
  if (!token) {
    throw new Error("captcha token missing");
  }
}

async function createUser(
  ctx: Context,
  input: RegisterInput
): Promise<string> {
  ctx.throwIfCancelled();
  console.log("user: create");
  await delay(50);
  if (!input.email) {
    throw new Error("email missing");
  }
  return "user_123";
}

async function subscribeEmail(
  ctx: Context,
  userId: string,
  email: string
): Promise<void> {
  ctx.throwIfCancelled();
  console.log("email: subscribe");
  await delay(30);
  if (!email) {
    throw new Error(`email subscription failed for ${userId}`);
  }
}

async function sendConfirmation(
  ctx: Context,
  userId: string,
  email: string
): Promise<void> {
  ctx.throwIfCancelled();
  console.log("email: confirmation");
  await delay(30);
  if (!email) {
    throw new Error(`confirmation email failed for ${userId}`);
  }
}

async function publishAnalytics(ctx: Context, userId: string): Promise<void> {
  ctx.throwIfCancelled();
  console.log("analytics: publish");
  await delay(10);
  if (!userId) {
    throw new Error("analytics missing user id");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const selfUrl = pathToFileURL(process.argv[1]).href;
const argvMatch = process.argv.some((arg) => {
  try {
    return pathToFileURL(arg).href === import.meta.url;
  } catch {
    return false;
  }
});
const isDirectRun = selfUrl === import.meta.url || argvMatch;
if (isDirectRun) {
  registerEndpoint({
    email: "user@example.com",
    password: "secret",
    captchaToken: "captcha-ok"
  }).catch((err) => {
    console.error("register: failed", err);
    process.exitCode = 1;
  });
}
