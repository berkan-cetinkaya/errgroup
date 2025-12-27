import { errgroup } from "errgroup";
import { Context, background } from "go-like-ctx";

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
    return await register(ctx, input);
  } finally {
    ctx.cancel();
  }
}

async function register(ctx: Context, input: RegisterInput): Promise<RegisterResult> {
  ctx.throwIfCancelled();
  await verifyCaptcha(ctx, input.captchaToken);

  const userId = await createUser(ctx, input);

  const g = errgroup(ctx);
  g.go((ctx) => subscribeEmail(ctx, userId, input.email));
  g.go((ctx) => sendConfirmation(ctx, userId, input.email));
  g.go((ctx) => publishAnalytics(ctx, userId));

  await g.wait();

  return { userId };
}

async function verifyCaptcha(ctx: Context, token: string): Promise<void> {
  ctx.throwIfCancelled();
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
  await delay(30);
  if (!email) {
    throw new Error(`confirmation email failed for ${userId}`);
  }
}

async function publishAnalytics(ctx: Context, userId: string): Promise<void> {
  ctx.throwIfCancelled();
  await delay(10);
  if (!userId) {
    throw new Error("analytics missing user id");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
