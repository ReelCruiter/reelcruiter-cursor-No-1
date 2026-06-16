import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function parseYearMonth(value: string): { year: string; month: string } {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return { year: "", month: "" };
  const [year, month] = value.split("-");
  return { year, month };
}

export function toYearMonth(year: string, month: string): string {
  if (!year || !month) return "";
  return `${year}-${month}`;
}

const currentYear = () => new Date().getFullYear();

interface MonthYearPickerProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Earliest allowed month (YYYY-MM), e.g. start date for end date picker */
  min?: string;
}

const MonthYearPicker = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  className,
  min,
}: MonthYearPickerProps) => {
  const parsed = parseYearMonth(value);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const next = parseYearMonth(value);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const years = useMemo(() => {
    const now = currentYear();
    const floor = min ? parseInt(parseYearMonth(min).year, 10) || now - 50 : now - 50;
    const list: number[] = [];
    for (let y = now + 1; y >= floor; y--) list.push(y);
    return list;
  }, [min]);

  const minParsed = min ? parseYearMonth(min) : null;

  const monthOptions = useMemo(() => {
    if (!minParsed?.year || !minParsed.month || year !== minParsed.year) return MONTHS;
    return MONTHS.filter((m) => m.value >= minParsed.month);
  }, [minParsed, year]);

  const emit = (nextYear: string, nextMonth: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    onChange(toYearMonth(nextYear, nextMonth));
  };

  const onYearChange = (nextYear: string) => {
    let nextMonth = month;
    if (minParsed && nextYear === minParsed.year && month && month < minParsed.month) {
      nextMonth = minParsed.month;
    }
    emit(nextYear, nextMonth);
  };

  const onMonthChange = (nextMonth: string) => {
    emit(year, nextMonth);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={month || undefined}
          onValueChange={onMonthChange}
          disabled={disabled}
        >
          <SelectTrigger id={id} aria-label={`${label} month`}>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year || undefined}
          onValueChange={onYearChange}
          disabled={disabled}
        >
          <SelectTrigger aria-label={`${label} year`}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default MonthYearPicker;
