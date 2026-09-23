import { Building2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CompanySelector({
  companies = [],
  activeCompanyId,
  onCompanyChange,
}) {
  const hasCompanies = companies.length > 0;

  return (
    <Select
      value={activeCompanyId}
      onValueChange={onCompanyChange}
      disabled={!hasCompanies}
    >
      <SelectTrigger className="h-10 min-w-[230px] border-primary-foreground/10 bg-primary-foreground/10 px-4 text-primary-foreground shadow-none hover:bg-primary-foreground/15 focus:ring-primary-foreground/25 [&>svg]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          <SelectValue placeholder={hasCompanies ? "Select company" : "No companies"} />
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-70" />
        </div>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[280px]">
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-muted-foreground">
                {company.id} &middot; {company.status}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
