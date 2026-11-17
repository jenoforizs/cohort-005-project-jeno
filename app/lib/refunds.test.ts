import { describe, it, expect } from "vitest";
import {
  checkRefundEligibility,
  getRefundAmount,
  isWithinRefundWindow,
  REFUND_WATCH_LIMIT_SECONDS,
  type RefundFacts,
} from "./refunds";

const PURCHASED_AT = new Date(2026, 0, 1, 23, 0).toISOString();

function facts(overrides: Partial<RefundFacts> = {}): RefundFacts {
  return {
    purchasedAt: PURCHASED_AT,
    now: new Date(2026, 0, 2, 12, 0),
    hasOpenRefundRequest: false,
    isClaimedTeamSeat: false,
    secondsWatched: 0,
    completedLessons: 0,
    totalLessons: 10,
    ...overrides,
  };
}

describe("isWithinRefundWindow", () => {
  it("includes the purchase day", () => {
    expect(
      isWithinRefundWindow(PURCHASED_AT, new Date(2026, 0, 1, 23, 30))
    ).toBe(true);
  });

  it("includes all of the fourteenth day after purchase", () => {
    expect(
      isWithinRefundWindow(PURCHASED_AT, new Date(2026, 0, 15, 23, 59))
    ).toBe(true);
  });

  it("closes on the fifteenth day after purchase", () => {
    expect(
      isWithinRefundWindow(PURCHASED_AT, new Date(2026, 0, 16, 0, 1))
    ).toBe(false);
  });
});

describe("checkRefundEligibility", () => {
  it("is refundable when every rule passes", () => {
    expect(checkRefundEligibility(facts())).toEqual({ refundable: true });
  });

  it("rejects a purchase that already has an open refund request", () => {
    expect(
      checkRefundEligibility(facts({ hasOpenRefundRequest: true }))
    ).toEqual({ refundable: false, reason: "open-refund-request" });
  });

  it("rejects a claimed team seat", () => {
    expect(checkRefundEligibility(facts({ isClaimedTeamSeat: true }))).toEqual({
      refundable: false,
      reason: "claimed-team-seat",
    });
  });

  it("rejects a purchase outside the refund window", () => {
    expect(
      checkRefundEligibility(facts({ now: new Date(2026, 0, 16, 9, 0) }))
    ).toEqual({ refundable: false, reason: "outside-refund-window" });
  });

  it("rejects once the watch limit is reached", () => {
    expect(
      checkRefundEligibility(
        facts({ secondsWatched: REFUND_WATCH_LIMIT_SECONDS })
      )
    ).toEqual({ refundable: false, reason: "watched-too-much" });
  });

  it("allows just under the watch limit", () => {
    expect(
      checkRefundEligibility(
        facts({ secondsWatched: REFUND_WATCH_LIMIT_SECONDS - 1 })
      )
    ).toEqual({ refundable: true });
  });

  it("rejects once half the lessons are completed", () => {
    expect(checkRefundEligibility(facts({ completedLessons: 5 }))).toEqual({
      refundable: false,
      reason: "completed-too-much",
    });
  });

  it("allows just under half the lessons completed", () => {
    expect(checkRefundEligibility(facts({ completedLessons: 4 }))).toEqual({
      refundable: true,
    });
  });

  it("ignores the completion rule for a course with no lessons", () => {
    expect(
      checkRefundEligibility(facts({ completedLessons: 0, totalLessons: 0 }))
    ).toEqual({ refundable: true });
  });
});

describe("getRefundAmount", () => {
  it("is what the learner paid, not the course's current list price", () => {
    expect(getRefundAmount({ amountPaid: 4900 })).toBe(4900);
  });
});
