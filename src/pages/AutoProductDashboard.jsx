import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CloudSun, MapPin, MessageSquareText, ClipboardCheck, ArrowRight, History, Loader2 } from "lucide-react";
import {
  ProductHeader, ProductToolbar, ProductRightRail, ProductWidgetCard, ProductPageHeader,
} from "@/components/product-shell/ProductChrome";
import { useAuth } from "@/context/AuthContext";
import { useAccessTier } from "@/hooks/useAccessTier";
import { useAutoAppClaims } from "@/hooks/useAutoAppClaims";
import { completeAutoAssessment } from "@/services/autoAppService";

// Stand-in for the Claim Toolkit Auto Liability dashboard (colors are CTK's,
// not Matrix's). When an Assessment is completed here, a background job copies
// the claim into Claim Matrix, where it shows as "ready" to start a Matrix.
// There is deliberately no "Send to Matrix" button — starting a Matrix happens
// inside Claim Matrix (Initiate Matrix).

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default function AutoProductDashboard() {
  const { user } = useAuth();
  const { capabilities, loading: tierLoading } = useAccessTier();
  const [refreshKey, setRefreshKey] = useState(0);
  const allowed = capabilities.initiateFromAuto;
  const { data, loading, error } = useAutoAppClaims(allowed ? refreshKey : -1);
  const [completingId, setCompletingId] = useState(null);

  const claims = allowed ? data ?? [] : [];
  const inMatrix = claims.filter((c) => c.matrixId);

  async function handleComplete(claim) {
    setCompletingId(claim.id);
    try {
      await completeAutoAssessment(claim.id);
      toast.success(`Assessment complete — ${claim.id} was copied into Claim Matrix by the background job`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Couldn't complete the Assessment");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <ProductHeader
        logoLabel="ClaimToolkit"
        logoSubLabel="Auto Liability"
        navItems={["Find Assessment", "New Assessment", "More ▾"]}
        userName={user?.name ?? ""}
      />
      <div className="flex">
        <div className="min-w-0 flex-1">
          <ProductToolbar />
          <div className="p-4 sm:p-6">
            <ProductPageHeader title="Auto Liability Dashboard" />

            {!tierLoading && !allowed ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
                This screen stands in for the Claim Toolkit Auto app, which only Level 3 (Auto) accounts use.{" "}
                <Link to="/dashboard" className="font-semibold underline">Go to Claim Matrix</Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <ProductWidgetCard icon={CloudSun} title="Weather">
                    <p className="text-sm text-slate-500">Weather lookup for a loss date and location (not part of this demo).</p>
                  </ProductWidgetCard>

                  <ProductWidgetCard icon={ClipboardCheck} title="Claim Matrix" tone="accent">
                    <div className="space-y-2">
                      {loading ? (
                        <div className="py-4 text-center text-sm text-slate-500">Loading…</div>
                      ) : inMatrix.length === 0 ? (
                        <div className="rounded-sm border border-dashed border-emerald-200 px-3 py-4 text-center text-xs text-emerald-800/70">
                          Claims appear here once their Assessment is complete.
                        </div>
                      ) : (
                        inMatrix.slice(0, 4).map((c) => (
                          <Link
                            key={c.id}
                            to={`/claims/${c.matrixId}`}
                            className="block rounded-sm border border-emerald-100 bg-emerald-50/60 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-emerald-800/70">{c.id}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.matrixStatus === "ready" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
                              >
                                {c.matrixStatus === "ready" ? "Ready for Matrix" : "In Matrix"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-sm font-semibold text-[#1b2540]">{c.title}</div>
                            <div className="text-xs text-emerald-800/70">{c.matrixStatusLabel}</div>
                          </Link>
                        ))
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <Link to="/claims" className="flex-1 rounded-sm border border-[#2c7a44] py-1.5 text-center text-xs font-semibold text-[#2c7a44] hover:bg-emerald-50">
                          View more
                        </Link>
                        <Link to="/dashboard" className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#2c7a44] py-1.5 text-xs font-semibold text-white hover:bg-[#256238]">
                          Open Claim Matrix <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </ProductWidgetCard>

                  <ProductWidgetCard icon={MessageSquareText} title="Ask CTK" action={<span className="flex items-center gap-1 text-xs font-semibold text-[#2c7a44]"><History className="h-3.5 w-3.5" aria-hidden="true" /> Ask CTK History</span>}>
                    <p className="text-sm text-slate-500">Ask CTK lives in the Auto app (not part of this demo).</p>
                  </ProductWidgetCard>
                </div>

                <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-base font-bold text-[#1b2540]">
                    <MapPin className="h-4 w-4 text-[#2c7a44]" aria-hidden="true" /> My claims
                  </div>
                  {loading ? (
                    <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
                  ) : error ? (
                    <div className="py-6 text-center text-sm text-red-700">{error.message}</div>
                  ) : claims.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">No claims found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="pb-2 pr-4 font-medium">Claim</th>
                            <th className="pb-2 pr-4 font-medium">Insured</th>
                            <th className="pb-2 pr-4 font-medium">Date of loss</th>
                            <th className="pb-2 pr-4 font-medium">Assessment</th>
                            <th className="pb-2 font-medium">Claim Matrix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {claims.map((c) => (
                            <tr key={c.id}>
                              <td className="py-2.5 pr-4">
                                <div className="font-mono text-xs text-slate-500">{c.id}</div>
                                <div className="font-medium text-[#1b2540]">{c.title}</div>
                              </td>
                              <td className="py-2.5 pr-4 text-slate-600">{c.insuredName}</td>
                              <td className="py-2.5 pr-4 text-slate-600">{formatDate(c.dateOfLoss)}</td>
                              <td className="py-2.5 pr-4">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.assessmentStatus === "Complete" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                  {c.assessmentStatus}
                                </span>
                              </td>
                              <td className="py-2.5">
                                {c.matrixId ? (
                                  <Link to={`/claims/${c.matrixId}`} className="text-xs font-semibold text-[#2c7a44] hover:underline">
                                    {c.matrixStatus === "ready" ? "Ready — open in Matrix" : "Open in Matrix"}
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleComplete(c)}
                                    disabled={completingId !== null}
                                    className="inline-flex items-center gap-1.5 rounded-sm bg-[#2c7a44] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#256238] disabled:opacity-60"
                                  >
                                    {completingId === c.id && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                                    Complete assessment (demo)
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Claims reach Claim Matrix on their own: when an Assessment is completed, a background job copies the
                    claim in. Starting a Matrix happens inside Claim Matrix.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <ProductRightRail active="auto" />
      </div>
    </div>
  );
}
