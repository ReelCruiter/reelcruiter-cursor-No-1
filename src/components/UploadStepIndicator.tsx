import { Check } from "lucide-react";

const steps = ["Choose type", "Add video & details", "Publish"];

interface UploadStepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export default function UploadStepIndicator({ currentStep }: UploadStepIndicatorProps) {
  return (
    <ol className="hidden md:flex items-center justify-between mb-8 gap-2">
      {steps.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : active
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : step}
            </div>
            <span
              className={`text-xs font-medium truncate hidden sm:block ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 min-w-[8px] ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
