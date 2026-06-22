const industries = [
  "Hotels",
  "Hospitality",
  "Front desk",
  "Retail",
  "Sales",
  "Customer service",
  "Healthcare",
  "Education",
  "Reception",
  "Guest relations",
];

export default function LandingIndustryMarquee() {
  const items = [...industries, ...industries];

  return (
    <div className="relative overflow-hidden py-3 -mx-4 sm:mx-0">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex w-max landing-marquee gap-3">
        {items.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="inline-flex shrink-0 items-center rounded-full border border-primary/15 bg-primary/[0.06] px-4 py-1.5 text-xs font-semibold text-primary"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
