// ─── Refund Rules ───
// What makes a purchase a refundable purchase (see GLOSSARY.md). The course
// page uses these rules to decide whether to offer "Request a refund", and the
// refund action uses the same rules to accept or reject the refund request, so
// the two cannot drift apart.
//
// Pure: nothing here may touch the database or the request.

export const REFUND_WINDOW_DAYS = 14;
export const REFUND_WATCH_LIMIT_SECONDS = 2 * 60 * 60;
/** Share of the course's lessons that, once completed, ends refundability. */
export const REFUND_COMPLETION_LIMIT = 0.5;

/** Everything about a purchase that decides whether it is refundable. */
export type RefundFacts = {
  purchasedAt: string;
  now: Date;
  hasOpenRefundRequest: boolean;
  isClaimedTeamSeat: boolean;
  secondsWatched: number;
  completedLessons: number;
  totalLessons: number;
};

export type NotRefundableReason =
  | "open-refund-request"
  | "claimed-team-seat"
  | "outside-refund-window"
  | "watched-too-much"
  | "completed-too-much";

export type RefundEligibility =
  { refundable: true } | { refundable: false; reason: NotRefundableReason };

// Compare whole calendar days, not hours — a purchase at 23:00 still gets all
// of its fourteenth day.
function calendarDay(when: Date): string {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

export function isWithinRefundWindow(purchasedAt: string, now: Date): boolean {
  const purchased = new Date(purchasedAt);
  const lastDay = new Date(purchasedAt);
  lastDay.setDate(lastDay.getDate() + REFUND_WINDOW_DAYS);

  const today = calendarDay(now);
  return today >= calendarDay(purchased) && today <= calendarDay(lastDay);
}

export function checkRefundEligibility(facts: RefundFacts): RefundEligibility {
  if (facts.hasOpenRefundRequest) {
    return { refundable: false, reason: "open-refund-request" };
  }
  if (facts.isClaimedTeamSeat) {
    return { refundable: false, reason: "claimed-team-seat" };
  }
  if (!isWithinRefundWindow(facts.purchasedAt, facts.now)) {
    return { refundable: false, reason: "outside-refund-window" };
  }
  if (facts.secondsWatched >= REFUND_WATCH_LIMIT_SECONDS) {
    return { refundable: false, reason: "watched-too-much" };
  }
  if (
    facts.totalLessons > 0 &&
    facts.completedLessons / facts.totalLessons >= REFUND_COMPLETION_LIMIT
  ) {
    return { refundable: false, reason: "completed-too-much" };
  }
  return { refundable: true };
}

/** The refund amount is always what the learner paid for the purchase. */
export function getRefundAmount(purchase: { amountPaid: number }): number {
  return purchase.amountPaid;
}
