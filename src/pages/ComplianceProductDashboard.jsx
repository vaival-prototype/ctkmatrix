import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useClaims } from "@/hooks/useClaims";
import { FileSearch, Sparkles, MapPin, ClipboardCheck, ArrowRight } from "lucide-react";
import {
  ProductHeader, ProductToolbar, ProductRightRail, ProductWidgetCard, ProductPageHeader,
} from "@/components/product-shell/ProductChrome";

// Stand-in for the Claim Toolkit Compliance dashboard. Its Claim Matrix card
// lists the claims this Compliance user is part of (started or invited to).
export default function ComplianceProductDashboard() {
  const { user } = useAuth();
  const { data, loading } = useClaims();
  const claims = (data ?? []).filter((c) => c.status !== "ready");

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <ProductHeader logoLabel="ClaimToolkit" logoSubLabel="Compliance" navItems={["State reference: Select State ▾", "More ▾"]} userName={user?.name ?? ""} />
      <div className="flex">
        <div className="min-w-0 flex-1">
          <ProductToolbar icons={undefined} />
          <div className="p-4 sm:p-6">
            <ProductPageHeader title="Claim Toolkit for Compliance" />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
              <ProductWidgetCard icon={FileSearch} title="Compliance Reports">
                <div className="mb-3 flex gap-2 text-xs font-semibold">
                  <span className="rounded-sm bg-[#2c7a44] px-2 py-1 text-white">Chart Specific</span>
                  <span className="rounded-sm border border-slate-300 px-2 py-1 text-slate-500">DOI Directives</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
                  {["Line of Business", "Report Category", "Chart", "Category", "State"].map((f) => (
                    <div key={f} className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">{f}</div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">Compliance reports live in the Compliance app (not part of this demo).</p>
              </ProductWidgetCard>

              <div className="flex flex-col gap-4">
                <ProductWidgetCard icon={Sparkles} title="News and Enhancements">
                  <div className="text-sm text-slate-400">No new items.</div>
                </ProductWidgetCard>

                <ProductWidgetCard
                  icon={ClipboardCheck}
                  title="Claim Matrix"
                  tone="accent"
                  action={<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">New</span>}
                >
                  <div className="space-y-2 text-sm">
                    {loading ? (
                      <div className="py-3 text-center text-slate-500">Loading…</div>
                    ) : claims.length === 0 ? (
                      <div className="rounded-sm border border-dashed border-emerald-200 px-3 py-4 text-center text-xs text-emerald-800/70">
                        You're not part of any claims yet.
                      </div>
                    ) : (
                      claims.slice(0, 4).map((c) => (
                        <Link
                          key={c.id}
                          to={`/claims/${c.id}`}
                          className="block rounded-sm border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[#1b2540] transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-emerald-800/70">{c.id}</span>
                            <span className="text-[10px] text-emerald-800/60">{c.statusLabel}</span>
                          </div>
                          <div className="mt-0.5 font-semibold">{c.title}</div>
                        </Link>
                      ))
                    )}
                    <Link to="/new-shared-claim" className="block rounded-sm border border-dashed border-[#2c7a44] py-1.5 text-center text-xs font-semibold text-[#2c7a44] hover:bg-emerald-50">
                      Start a Matrix (manual entry)
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link to="/claims" className="flex-1 rounded-sm border border-[#2c7a44] py-1.5 text-center text-xs font-semibold text-[#2c7a44] hover:bg-emerald-50">
                        View more
                      </Link>
                      <Link to="/dashboard" className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#2c7a44] py-1.5 text-xs font-semibold text-white hover:bg-[#256238]">
                        Open Claim Matrix <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </ProductWidgetCard>

                <ProductWidgetCard icon={MapPin} title="What's New Map">
                  <div className="rounded-sm border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">US map · states with recent updates</div>
                </ProductWidgetCard>
              </div>
            </div>
          </div>
        </div>
        <ProductRightRail active="compliance-auto" />
      </div>
    </div>
  );
}
