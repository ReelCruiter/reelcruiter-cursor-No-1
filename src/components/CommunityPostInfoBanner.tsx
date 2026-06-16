interface CommunityPostInfoBannerProps {
  text: string;
  className?: string;
}

const CommunityPostInfoBanner = ({ text, className = "" }: CommunityPostInfoBannerProps) => (
  <div
    className={`rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-3 space-y-2 ${className}`}
  >
    <span className="inline-flex text-[10px] tracking-wide font-bold bg-sky-600 text-white px-2 py-0.5 rounded-full">
      COMMUNITY
    </span>
    <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
  </div>
);

export default CommunityPostInfoBanner;
