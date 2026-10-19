import { removeTestUsers } from "./helpers";

// Clears test users left by a crashed run, and this run's users afterwards.
export async function setup() {
  process.loadEnvFile(".env.local");
  await removeTestUsers();
}

export async function teardown() {
  await removeTestUsers();
}
