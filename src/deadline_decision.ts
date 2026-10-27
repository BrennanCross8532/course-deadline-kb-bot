export type DeadlineDecision = {
  status: "on_time" | "late";
  message: string;
};

export function decideDeadline(dueAt: Date, submittedAt: Date): DeadlineDecision {
  if (submittedAt.getTime() <= dueAt.getTime()) {
    return { status: "on_time", message: "Submission is on time." };
  }
  return { status: "late", message: "Submission is late and should be included in the educator report." };
}
