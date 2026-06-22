import { Briefcase, Heart, MessageSquare, Play, Rss, Send, User } from "lucide-react";

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="h-6 bg-muted/60 border-b border-border flex items-center justify-center">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="aspect-[9/14] bg-background overflow-hidden">{children}</div>
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-foreground">{label}</p>
    </div>
  );
}

function FeedShot() {
  return (
    <div className="h-full flex flex-col text-[8px]">
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between font-semibold">
        <span>Feed</span>
        <Rss className="w-3 h-3 text-primary" />
      </div>
      <div className="flex-1 relative bg-primary/85">
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-5 h-5 text-white fill-white/40" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white">
          <p className="font-semibold">Front Desk · Harbour Hotel</p>
          <p className="opacity-90">Dubai · Full-time</p>
        </div>
      </div>
      <div className="flex justify-around py-1.5 border-t border-border text-muted-foreground">
        <Heart className="w-3 h-3" />
        <MessageSquare className="w-3 h-3" />
        <Briefcase className="w-3 h-3 text-primary" />
      </div>
    </div>
  );
}

function ProfileShot() {
  return (
    <div className="h-full p-2 text-[8px] space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-[9px]">Sofia Martinez</p>
          <p className="text-muted-foreground">Front desk · Hospitality</p>
        </div>
      </div>
      <div className="aspect-video rounded-lg bg-primary/80 flex items-center justify-center relative">
        <Play className="w-5 h-5 text-white fill-white/30" />
        <span className="absolute bottom-1 left-1 text-white text-[7px] font-medium">Intro video</span>
      </div>
      <p className="text-muted-foreground leading-snug">
        Open to guest-facing roles in hotels and retail.
      </p>
      <div className="flex gap-1">
        {["Reception", "Sales"].map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded-full bg-muted font-medium">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function JobShot() {
  return (
    <div className="h-full flex flex-col text-[8px]">
      <div className="relative aspect-[5/4] bg-primary/85 flex items-center justify-center shrink-0">
        <Play className="w-5 h-5 text-white fill-white/30" />
      </div>
      <div className="p-2 flex-1 flex flex-col">
        <p className="font-bold text-[9px]">Retail Sales Associate</p>
        <p className="text-muted-foreground">City Mall · Part-time</p>
        <p className="mt-1 text-muted-foreground leading-snug flex-1">
          Help customers, hit targets, work in a busy store team.
        </p>
        <div className="h-6 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1">
          <Briefcase className="w-3 h-3" />
          Apply
        </div>
      </div>
    </div>
  );
}

function MessagesShot() {
  return (
    <div className="h-full flex flex-col text-[8px]">
      <div className="px-2 py-1.5 border-b border-border font-semibold">Messages</div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="bg-muted rounded-lg px-2 py-1 max-w-[90%]">
          Thanks for your video. When can you start?
        </div>
        <div className="bg-primary text-primary-foreground rounded-lg px-2 py-1 max-w-[90%] ml-auto">
          I can start next month.
        </div>
      </div>
      <div className="p-1.5 border-t border-border flex gap-1">
        <div className="flex-1 h-5 rounded-full bg-muted" />
        <Send className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}

const shots = [
  { label: "Video profiles", content: <FeedShot /> },
  { label: "Profile page", content: <ProfileShot /> },
  { label: "One-click applications", content: <JobShot /> },
  { label: "Direct messaging", content: <MessagesShot /> },
];

export default function LandingProductShots() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {shots.map(({ label, content }) => (
        <PhoneFrame key={label} label={label}>
          {content}
        </PhoneFrame>
      ))}
    </div>
  );
}
