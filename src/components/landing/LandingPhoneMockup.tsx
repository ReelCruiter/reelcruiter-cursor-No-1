import { useState } from "react";
import { Briefcase, Building2, MessageCircle, Send, Play, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewId = "candidate" | "employer" | "messages" | "apply";

const tabs: { id: ViewId; label: string }[] = [
  { id: "candidate", label: "Profile" },
  { id: "employer", label: "Company" },
  { id: "messages", label: "Chat" },
  { id: "apply", label: "Apply" },
];

function CandidateView() {
  return (
    <div className="flex flex-col h-full bg-background text-[10px]">
      <div className="relative aspect-[4/5] bg-primary/90 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="absolute bottom-2 left-2 right-2 text-white font-semibold text-[9px] leading-tight">
          Sofia · Front desk · Dubai
        </span>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        <p className="font-semibold text-foreground text-[10px]">Open to hospitality roles</p>
        <p className="text-muted-foreground leading-snug">
          Friendly, organised, 3 years on reception. Fluent in English and Arabic.
        </p>
        <div className="flex gap-1 flex-wrap">
          {["Guest service", "Reception", "Sales"].map((s) => (
            <span key={s} className="px-1.5 py-0.5 rounded-full bg-muted text-[8px] font-medium">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployerView() {
  return (
    <div className="flex flex-col h-full bg-background text-[10px]">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">Harbour Hotel</p>
          <p className="text-muted-foreground text-[8px]">Hospitality · 120 staff</p>
        </div>
      </div>
      <div className="relative flex-1 bg-muted/50 m-2 rounded-lg flex items-center justify-center">
        <Play className="w-6 h-6 text-primary fill-primary/20" />
        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-medium text-foreground">
          Meet our front desk team
        </span>
      </div>
      <p className="px-2 pb-2 text-muted-foreground leading-snug">
        See our lobby, team culture, and what a day on reception looks like.
      </p>
    </div>
  );
}

function MessagesView() {
  return (
    <div className="flex flex-col h-full bg-background text-[10px]">
      <div className="px-2 py-1.5 border-b border-border font-semibold flex items-center gap-1.5">
        <User className="w-3 h-3" /> Harbour Hotel
      </div>
      <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
        <div className="bg-muted rounded-lg rounded-tl-none px-2 py-1 max-w-[85%] text-[9px]">
          Hi Sofia, we loved your intro video. Are you free for a quick chat?
        </div>
        <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none px-2 py-1 max-w-[85%] ml-auto text-[9px]">
          Thank you! Yes, I am available this week.
        </div>
        <div className="bg-muted rounded-lg rounded-tl-none px-2 py-1 max-w-[85%] text-[9px]">
          Great. We will send details shortly.
        </div>
      </div>
      <div className="p-1.5 border-t border-border flex gap-1">
        <div className="flex-1 h-6 rounded-full bg-muted" />
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Send className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}

function ApplyView() {
  return (
    <div className="flex flex-col h-full bg-background text-[10px] p-2">
      <div className="relative aspect-video rounded-lg bg-primary/90 mb-2 flex items-center justify-center">
        <Play className="w-6 h-6 text-white fill-white/30" />
      </div>
      <p className="font-semibold text-foreground">Front Desk Associate</p>
      <p className="text-muted-foreground text-[9px]">Harbour Hotel · Full-time · Dubai</p>
      <p className="mt-1.5 text-muted-foreground leading-snug flex-1">
        Guest-facing role on our reception team. Day shifts, training provided.
      </p>
      <button
        type="button"
        className="mt-2 w-full h-7 rounded-full bg-primary text-primary-foreground font-semibold text-[9px] flex items-center justify-center gap-1"
      >
        <Briefcase className="w-3 h-3" />
        Apply with one click
      </button>
    </div>
  );
}

const views: Record<ViewId, () => JSX.Element> = {
  candidate: CandidateView,
  employer: EmployerView,
  messages: MessagesView,
  apply: ApplyView,
};

export default function LandingPhoneMockup() {
  const [active, setActive] = useState<ViewId>("candidate");
  const ActiveView = views[active];

  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[2rem] border-[6px] border-foreground/90 bg-foreground/90 shadow-xl overflow-hidden">
        <div className="bg-foreground h-5 flex items-center justify-center">
          <div className="w-16 h-1 rounded-full bg-background/30" />
        </div>
        <div className="bg-background h-[340px] sm:h-[380px] overflow-hidden">
          <ActiveView />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              "py-2 px-1 rounded-xl text-[11px] font-semibold transition-colors min-h-[44px]",
              active === id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <MessageCircle className="w-3.5 h-3.5" />
        Tap to explore the app
      </p>
    </div>
  );
}
