/** Abstract product illustration — no screenshots, pure CSS motion (Linear / Notion style). */
function FloatWrap({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="landing-float" style={{ animationDelay: delay }}>
        {children}
      </div>
    </div>
  );
}

export default function LandingHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none aspect-square sm:aspect-[4/3] lg:aspect-auto lg:min-h-[420px]">
      <div
        className="absolute inset-[8%] rounded-[2rem] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/20 border border-primary/10 landing-hero-glow"
        aria-hidden
      />

      <FloatWrap
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] max-w-[220px] z-20"
        delay="0ms"
      >
        <div className="rounded-2xl bg-primary text-primary-foreground p-1 shadow-2xl shadow-primary/30 ring-1 ring-white/10">
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-b from-primary-foreground/20 to-primary-foreground/5 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.35),transparent_55%)]" />
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/25 landing-pulse-play">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white ml-1" />
            </div>
            <p className="absolute bottom-3 left-3 right-3 text-[10px] sm:text-xs font-semibold leading-tight opacity-95">
              Intro video · 45 sec
            </p>
          </div>
        </div>
      </FloatWrap>

      <FloatWrap
        className="absolute right-[4%] top-[12%] w-[44%] max-w-[168px] z-30"
        delay="400ms"
      >
        <div className="rounded-2xl bg-card border border-border p-3 shadow-lg card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
              H
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-foreground truncate">
              Harbour Hotel
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
            Loved your intro video. Free to chat this week?
          </p>
        </div>
      </FloatWrap>

      <FloatWrap className="absolute left-[2%] bottom-[14%] z-30" delay="800ms">
        <div className="rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold shadow-lg shadow-accent/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-foreground/80 animate-pulse" />
          One-click apply
        </div>
      </FloatWrap>

      <FloatWrap className="absolute right-[8%] bottom-[18%] z-10" delay="1200ms">
        <div className="rounded-xl bg-card/90 backdrop-blur border border-border px-3 py-2 text-[10px] sm:text-xs font-semibold text-foreground shadow-md">
          ✓ 100% free
        </div>
      </FloatWrap>
    </div>
  );
}
