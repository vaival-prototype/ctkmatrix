import { Link } from "react-router-dom";
import {
  Car, Building2, Home, ClipboardCheck, LogOut, Compass, Search, Star, Plus,
  CloudSun, Map as MapIcon, Bell,
} from "lucide-react";

/**
 * Visual mock of the real united.claimtoolkit.com product chrome (Auto Liability
 * and Compliance apps), captured from live screenshots on 2026-09-21 -- see the
 * "CTK Dashboard UI Reference" project doc. This is what a Claim Matrix entry
 * point embedded inside Auto/Compliance looks like, instead of Matrix demoing
 * from a cold sign-in page. Colors are hard-coded (not the Matrix app's own
 * theme tokens) so these pages read as "inside CTK", visually distinct from
 * the Matrix app itself.
 */

const RAIL_ITEMS = [
  { key: "auto", label: "Auto Liability", icon: Car, to: "/product/auto" },
  { key: "compliance-auto", label: "Compliance: Auto", icon: Car, to: "/product/compliance" },
  { key: "compliance-commercial", label: "Compliance: Commercial", icon: Building2, to: "/product/compliance" },
  { key: "compliance-homeowners", label: "Compliance: Homeowners", icon: Home, to: "/product/compliance" },
  { key: "matrix", label: "Claim Matrix", icon: ClipboardCheck, to: "/dashboard", accent: true },
];

export function ProductHeader({ logoLabel, logoSubLabel, navItems, clientName = "United", incidentLabel = "Incident Management" }) {
  return (
    <header className="flex h-16 items-center justify-between bg-[#1b2540] px-6 text-white">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#2c7a44] text-sm">🚗</div>
          <div className="leading-tight">
            <div className="text-sm font-bold">{logoLabel}</div>
            {logoSubLabel && <div className="text-[11px] text-white/60">{logoSubLabel}</div>}
          </div>
        </div>
        <nav className="hidden items-center gap-5 text-sm text-white/80 md:flex">
          {navItems.map((item) => (
            <span key={item} className="cursor-default hover:text-white">{item}</span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden rounded-sm bg-white px-3 py-1 text-xs font-bold text-[#1b2540] sm:block">{clientName}</div>
        <button type="button" className="rounded-sm bg-[#2c7a44] px-3 py-1.5 text-xs font-semibold hover:bg-[#256238]">
          {incidentLabel}
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">I</div>
      </div>
    </header>
  );
}

export function ProductToolbar({ icons = [Compass, Search, Star, Plus, CloudSun, MapIcon, Car, Building2] }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-[#2c7a44] bg-white px-6 py-2">
      <div className="flex items-center gap-2">
        {icons.map((Icon, i) => (
          <div key={i} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[#2c7a44]/50 text-[#2c7a44]">
            <Icon className="h-4 w-4" />
          </div>
        ))}
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-[#2c7a44]/50 text-[#2c7a44]">
        <LogOut className="h-4 w-4" />
      </div>
    </div>
  );
}

export function ProductRightRail({ active }) {
  return (
    <aside className="hidden w-24 shrink-0 flex-col bg-[#1b2540] py-2 lg:flex">
      {RAIL_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`flex flex-col items-center gap-1.5 border-b border-white/10 px-1.5 py-3 text-center transition-colors ${
              isActive ? "bg-white/10" : "hover:bg-white/5"
            } ${item.accent ? "relative" : ""}`}
            title={item.label}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-sm shadow-sm ${
                item.accent ? "bg-emerald-400 text-[#1b2540] ring-2 ring-emerald-300/60" : "bg-[#2c7a44] text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="max-w-[5.5rem] text-[10px] font-semibold leading-tight text-white">{item.label}</span>
            {item.accent && (
              <span className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#1b2540]">
                New
              </span>
            )}
          </Link>
        );
      })}
    </aside>
  );
}

export function ProductWidgetCard({ icon: Icon, title, action, children, tone = "default" }) {
  return (
    <div className={`rounded-md border bg-white p-4 shadow-sm ${tone === "accent" ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone === "accent" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-50 text-[#2c7a44]"}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-base font-bold text-[#1b2540]">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ProductPageHeader({ title, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-[#1b2540]">{title}</h1>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

export { Bell };
