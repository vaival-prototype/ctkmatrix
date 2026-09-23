import { Link } from "react-router-dom";
import {
  CloudSun, MapPin, MessageSquareText, ClipboardCheck, Bell, ArrowRight, History,
} from "lucide-react";
import {
  ProductHeader, ProductToolbar, ProductRightRail, ProductWidgetCard, ProductPageHeader,
} from "@/components/product-shell/ProductChrome";

// Static mock of the real Auto Liability dashboard (united.claimtoolkit.com/AutoLiaV5) with
// the Loss Location Finder widget replaced by a Claim Matrix activity widget -- the swap Mark
// asked for on the Sept 16 call, in the same card footprint so it reads as a drop-in
// replacement rather than a layout change. Not wired to live data; this page exists to give
// Mark a login-through-dashboard walkthrough instead of starting the demo at Matrix sign-in.
// Target ids match real seeded matrixs in mock.js (sharedClaimMatrixs), so clicking
// a tile lands on an actual claim detail page instead of a dead/fabricated id.
const recentMatrixActivity = [
  { id: "CM-2406-0148", label: "Atlas Mutual proposed a settlement", detail: "Negotiation active · $24,500 offer", time: "12m ago" },
  { id: "CM-2406-0142", label: "Northbridge Insurance uploaded a document", detail: "Evidence · police-report-final.pdf", time: "1h ago" },
  { id: "CM-2406-0131", label: "Harbor Re accepted your invitation", detail: "Participants · joined the matrix", time: "3h ago" },
];

export default function AutoProductDashboard() {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <ProductHeader logoLabel="ClaimToolkit" logoSubLabel="Auto Liability" navItems={["Find Assessment", "New Assessment", "More ▾"]} />
      <div className="flex">
        <div className="min-w-0 flex-1">
          <ProductToolbar />
          <div className="p-6">
            <ProductPageHeader
              title="Auto Liability Dashboard"
              actions={
                <>
                  <select className="rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600"><option>Widgets</option></select>
                  <button type="button" className="rounded-sm bg-[#2c7a44] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#256238]">Contact Claim Toolkit</button>
                </>
              }
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ProductWidgetCard icon={CloudSun} title="Weather">
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">Date &middot; 20/09/2026</div>
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">Street address, city, state</div>
                  <button type="button" className="w-full rounded-sm bg-[#2c7a44] py-1.5 text-xs font-semibold text-white">Search</button>
                </div>
              </ProductWidgetCard>

              <ProductWidgetCard
                icon={ClipboardCheck}
                title="Claim Matrix"
                tone="accent"
                action={<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Replaces Loss Location Finder</span>}
              >
                <div className="space-y-2">
                  {recentMatrixActivity.map((a) => (
                    <Link
                      key={a.id}
                      to={`/claims/${a.id}`}
                      className="block rounded-sm border border-emerald-100 bg-emerald-50/60 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-mono text-emerald-800/70">{a.id}</div>
                        <div className="text-[10px] text-emerald-800/60">{a.time}</div>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-[#1b2540]">{a.label}</div>
                      <div className="text-xs text-emerald-800/70">{a.detail}</div>
                    </Link>
                  ))}
                  <div className="mt-1 flex items-center gap-2">
                    <Link to="/claims" className="flex-1 rounded-sm border border-[#2c7a44] py-1.5 text-center text-xs font-semibold text-[#2c7a44] hover:bg-emerald-50">
                      View more
                    </Link>
                    <Link to="/dashboard" className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#2c7a44] py-1.5 text-xs font-semibold text-white hover:bg-[#256238]">
                      Open Claim Matrix <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </ProductWidgetCard>

              <ProductWidgetCard icon={MessageSquareText} title="Ask CTK" action={<span className="flex items-center gap-1 text-xs font-semibold text-[#2c7a44]"><History className="h-3.5 w-3.5" /> Ask CTK History</span>}>
                <div className="mb-2 text-[11px] text-slate-400">Ask CTK is AI. AI can make mistakes.</div>
                <div className="flex items-center gap-2 rounded-sm border border-slate-200 px-3 py-2">
                  <input disabled placeholder="Ask CTK" className="flex-1 bg-transparent text-sm text-slate-400 outline-none" />
                  <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#2c7a44] text-white"><ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </ProductWidgetCard>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-base font-bold text-[#1b2540]">
                <MapPin className="h-4 w-4 text-[#2c7a44]" /> My Last Ten Claims
              </div>
              <div className="rounded-sm border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">No claims found.</div>
            </div>
          </div>
        </div>
        <ProductRightRail active="auto" />
      </div>
    </div>
  );
}
