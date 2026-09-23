import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b py-3 last:border-0">
      <Skeleton className="h-4 w-24 shrink-0" />
      <Skeleton className="h-4 w-40 shrink-0" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      <Skeleton className="h-4 w-20 shrink-0" />
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="px-4">
        {Array.from({ length: rows }, (_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="rounded-lg border bg-card p-5 space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-28 shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="rounded-lg border bg-card p-5 space-y-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function PageSkeleton({ variant = "table" }) {
  switch (variant) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "detail":
      return <DetailSkeleton />;
    case "form":
      return <FormSkeleton />;
    case "cards":
      return <CardGridSkeleton />;
    default:
      return (
        <div className="space-y-5">
          <HeaderSkeleton />
          <TableSkeleton />
        </div>
      );
  }
}

export { HeaderSkeleton, CardSkeleton, TableSkeleton, StatCardSkeleton, DetailSkeleton, FormSkeleton };
