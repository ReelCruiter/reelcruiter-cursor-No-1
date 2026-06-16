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

export function parseIsoDate(value: string): { year: string; month: string; day: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { year: "", month: "", day: "" };
  }
  const [year, month, day] = value.split("-");
  return { year, month, day };
}

export function toIsoDate(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function todayIsoParts() {
  const t = new Date();
  return {
    year: String(t.getFullYear()),
    month: String(t.getMonth() + 1).padStart(2, "0"),
    day: String(t.getDate()).padStart(2, "0"),
  };
}

interface OptionalDatePickerProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** When true, only today and future dates can be selected. */
  minToday?: boolean;
}

const OptionalDatePicker = ({
  id,
  label,
  value,
  onChange,
  className,
  minToday = false,
}: OptionalDatePickerProps) => {
  const parsed = parseIsoDate(value);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  useEffect(() => {
    const next = parseIsoDate(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const today = todayIsoParts();

  const years = useMemo(() => {
    const start = minToday ? parseInt(today.year, 10) : parseInt(today.year, 10) - 1;
    const end = start + 3;
    const list: number[] = [];
    for (let y = start; y <= end; y++) list.push(y);
    return list;
  }, [minToday, today.year]);

  const monthOptions = useMemo(() => {
    if (!minToday || year !== today.year) return MONTHS;
    return MONTHS.filter((m) => m.value >= today.month);
  }, [minToday, year, today.year, today.month]);

  const dayOptions = useMemo(() => {
    if (!year || !month) return [];
    const max = daysInMonth(parseInt(year, 10), parseInt(month, 10));
    let start = 1;
    if (minToday && year === today.year && month === today.month) {
      start = parseInt(today.day, 10);
    }
    return Array.from({ length: max - start + 1 }, (_, i) => start + i);
  }, [year, month, minToday, today.year, today.month, today.day]);

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    onChange(toIsoDate(nextYear, nextMonth, nextDay));
  };

  const onYearChange = (nextYear: string) => {
    let nextMonth = month;
    let nextDay = day;
    if (minToday && nextYear === today.year && nextMonth && nextMonth < today.month) {
      nextMonth = today.month;
    }
    if (nextYear && nextMonth && nextDay) {
      const max = daysInMonth(parseInt(nextYear, 10), parseInt(nextMonth, 10));
      if (parseInt(nextDay, 10) > max) nextDay = String(max).padStart(2, "0");
      if (minToday && nextYear === today.year && nextMonth === today.month) {
        const minDay = parseInt(today.day, 10);
        if (parseInt(nextDay, 10) < minDay) nextDay = today.day;
      }
    }
    emit(nextYear, nextMonth, nextDay);
  };

  const onMonthChange = (nextMonth: string) => {
    let nextDay = day;
    if (year && nextMonth && nextDay) {
      const max = daysInMonth(parseInt(year, 10), parseInt(nextMonth, 10));
      if (parseInt(nextDay, 10) > max) nextDay = String(max).padStart(2, "0");
      if (minToday && year === today.year && nextMonth === today.month) {
        const minDay = parseInt(today.day, 10);
        if (parseInt(nextDay, 10) < minDay) nextDay = today.day;
      }
    }
    emit(year, nextMonth, nextDay);
  };

  const onDayChange = (nextDay: string) => {
    emit(year, month, nextDay);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={month || undefined} onValueChange={onMonthChange}>
          <SelectTrigger id={id} aria-label="Deadline month">
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
        <Select value={year || undefined} onValueChange={onYearChange}>
          <SelectTrigger aria-label="Deadline year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Select value={day || undefined} onValueChange={onDayChange} disabled={!year || !month}>
        <SelectTrigger aria-label="Deadline day">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {dayOptions.map((d) => (
            <SelectItem key={d} value={String(d).padStart(2, "0")}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OptionalDatePicker;
