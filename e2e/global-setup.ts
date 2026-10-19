import { removeTestUsers } from "../tests/db/helpers";

// The flows run against the live project with throwaway users
// (butterlogs-test+…): clear any left by a crashed run, and this run's after.
export default async function globalSetup() {
  await removeTestUsers();
  return async () => {
    await removeTestUsers();
  };
}
