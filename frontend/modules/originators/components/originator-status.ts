import type { OriginatorStatus } from "../types";

export function originatorStatusBadgeClass(status: OriginatorStatus) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "PASSIVE") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-red-50 text-red-600 border-red-200";
}
