import { describe, expect, it } from "vitest";
import { authMessage, OFFLINE_MESSAGE } from "./auth-messages";

describe("authMessage", () => {
  it("says a wrong or expired code didn't work", () => {
    expect(authMessage({ code: "otp_expired", status: 403 })).toEqual({
      message: "That code didn’t work. Check it, or ask for a new one.",
      unexpected: false,
    });
  });

  it("says when no account uses the email", () => {
    expect(authMessage({ code: "otp_disabled", status: 422 }).message).toBe("No account uses this email.");
    expect(authMessage({ code: "user_not_found" }).message).toBe("No account uses this email.");
  });

  it("asks to check a bad email", () => {
    expect(authMessage({ code: "email_address_invalid" }).message).toBe("Check the email address.");
    expect(authMessage({ code: "validation_failed" }).message).toBe("Check the email address.");
  });

  it("asks her to wait when rate limited", () => {
    const wait = "Too many tries. Wait a minute, then try again.";
    expect(authMessage({ code: "over_email_send_rate_limit" }).message).toBe(wait);
    expect(authMessage({ code: "over_request_rate_limit" }).message).toBe(wait);
    expect(authMessage({ status: 429 }).message).toBe(wait);
  });

  it("says signing in needs internet when the server can't be reached", () => {
    expect(authMessage({ name: "AuthRetryableFetchError", status: 0 }).message).toBe(OFFLINE_MESSAGE);
    expect(authMessage({ status: 0 }).message).toBe(OFFLINE_MESSAGE);
  });

  it("falls back to a general line and flags it as unexpected", () => {
    expect(authMessage({ code: "unexpected_failure", status: 500 })).toEqual({
      message: "Something went wrong. Try again.",
      unexpected: true,
    });
    expect(authMessage({}).unexpected).toBe(true);
  });
});
