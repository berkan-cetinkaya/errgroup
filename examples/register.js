import { errgroup } from "errgroup";
import { background } from "go-like-ctx";
import { pathToFileURL } from "node:url";

/**
 * @typedef {Object} RegisterInput
 * @property {string} email
 * @property {string} password
 * @property {string} captchaToken
 */

/**
 * @typedef {Object} RegisterResult
 * @property {string} userId
 */

/**
 * @typedef {import("go-like-ctx").Context} Context
 */

/**
 * @param {RegisterInput} input
 * @returns {Promise<RegisterResult>}
 */
export async function registerEndpoint(input) {
  const ctx = background().withTimeout(10_000);
  try {
    console.log("register: start");
    return await register(ctx, input);
  } finally {
    console.log("register: end");
    ctx.cancel();
  }
}

/**
 * @param {Context} ctx
 * @param {RegisterInput} input
 * @returns {Promise<RegisterResult>}
 */
async function register(ctx, input) {
  ctx.throwIfCancelled();
  console.log("register: verify captcha");
  await verifyCaptcha(ctx, input.captchaToken);

  console.log("register: create user");
  const userId = await createUser(ctx, input);

  console.log("register: fan-out tasks");
  const g = errgroup(ctx);
  g.go((childCtx) => subscribeEmail(childCtx, userId, input.email));
  g.go((childCtx) => sendConfirmation(childCtx, userId, input.email));
  g.go((childCtx) => publishAnalytics(childCtx, userId));

  console.log("register: wait for tasks");
  await g.wait();

  console.log("register: done");
  return { userId };
}

/**
 * @param {Context} ctx
 * @param {string} token
 * @returns {Promise<void>}
 */
async function verifyCaptcha(ctx, token) {
  ctx.throwIfCancelled();
  console.log("captcha: verify");
  await delay(20);
  if (!token) {
    throw new Error("captcha token missing");
  }
}

/**
 * @param {Context} ctx
 * @param {RegisterInput} input
 * @returns {Promise<string>}
 */
async function createUser(ctx, input) {
  ctx.throwIfCancelled();
  console.log("user: create");
  await delay(50);
  if (!input.email) {
    throw new Error("email missing");
  }
  return "user_123";
}

/**
 * @param {Context} ctx
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<void>}
 */
async function subscribeEmail(ctx, userId, email) {
  ctx.throwIfCancelled();
  console.log("email: subscribe");
  await delay(30);
  if (!email) {
    throw new Error(`email subscription failed for ${userId}`);
  }
}

/**
 * @param {Context} ctx
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<void>}
 */
async function sendConfirmation(ctx, userId, email) {
  ctx.throwIfCancelled();
  console.log("email: confirmation");
  await delay(30);
  if (!email) {
    throw new Error(`confirmation email failed for ${userId}`);
  }
}

/**
 * @param {Context} ctx
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function publishAnalytics(ctx, userId) {
  ctx.throwIfCancelled();
  console.log("analytics: publish");
  await delay(10);
  if (!userId) {
    throw new Error("analytics missing user id");
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
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
