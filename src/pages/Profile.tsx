import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Play, Briefcase, Calendar, CheckCircle, MapPin, Pencil, Trash2, Settings as SettingsIcon, Bookmark, Inbox, Video as VideoIcon, BadgeCheck, Plus, Search, Building2, FileText, MessageSquare } from "lucide-react";
import VideoPostCard from "@/components/VideoPostCard";
import EditProfileSheet from "@/components/EditProfileSheet";
import JobSeekerResumeSection from "@/components/JobSeekerResumeSection";
import ExperienceDialog, { AddExperienceButton } from "@/components/ExperienceDialog";
import UserAvatar from "@/components/UserAvatar";
import SecureVideo from "@/components/SecureVideo";
import FollowListDialog from "@/components/FollowListDialog";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/lib/profileStore";
import { useFollow } from "@/lib/follows";
import { useSavedJobs } from "@/lib/savedJobs";
import { fetchReceivedApplicationsCount, isActiveJobListing } from "@/lib/applications";
import { brandPostForEmployer, employerProfileByline } from "@/lib/posts";
import type { Experience } from "@/lib/models";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserMode } from "@/lib/userMode";
import { IconLinkedin, IconTwitter, IconInstagram, IconFacebook, IconTiktok, IconYoutube, IconWhatsapp } from "@/components/SocialIcons";
import type { ProfileData } from "@/lib/profileStore";
import { communityPostVisibilityCopy } from "@/lib/communityPostCopy";
import CommunityPostInfoBanner from "@/components/CommunityPostInfoBanner";
import { PROFILE_VIDEO_CV_GUIDANCE } from "@/lib/uploadVideoGuidance";
import ProfileVideosEmptyState from "@/components/ProfileVideosEmptyState";

const normalizeUrl = (u: string) => {
  const v = u.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

// WhatsApp links use the wa.me deep link with the digits of the phone number.
const whatsappLink = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};

const CompanySocialLinks = ({ profile }: { profile: ProfileData }) => {
  const links = [
    { key: "linkedin", url: normalizeUrl(profile.companyLinkedin), Icon: IconLinkedin, label: "LinkedIn", color: "#0A66C2" },
    { key: "instagram", url: normalizeUrl(profile.companyInstagram), Icon: IconInstagram, label: "Instagram", color: "#E4405F" },
    { key: "facebook", url: normalizeUrl(profile.companyFacebook), Icon: IconFacebook, label: "Facebook", color: "#1877F2" },
    { key: "tiktok", url: normalizeUrl(profile.companyTiktok), Icon: IconTiktok, label: "TikTok", color: "currentColor" },
    { key: "youtube", url: normalizeUrl(profile.companyYoutube), Icon: IconYoutube, label: "YouTube", color: "#FF0000" },
    { key: "twitter", url: normalizeUrl(profile.companyTwitter), Icon: IconTwitter, label: "X", color: "currentColor" },
    { key: "whatsapp", url: whatsappLink(profile.companyWhatsapp), Icon: IconWhatsapp, label: "WhatsApp", color: "#25D366" },
  ].filter((l) => l.url && l.url.length > 0);
  if (links.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map(({ key, url, Icon, label, color }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label}`}
          title={label}
          className="w-10 h-10 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
          style={{ color }}
        >
          <Icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
};

const Profile = () => {
  const profile = useProfileStore((s) => s.profile);
  const experiences = useProfileStore((s) => s.experiences);
  const posts = useProfileStore((s) => s.posts);
  const removeExperience = useProfileStore((s) => s.removeExperience);
  const loadProfileFromDb = useProfileStore((s) => s.loadProfileFromDb);
  const loadMyPostsFromDb = useProfileStore((s) => s.loadMyPostsFromDb);
  const userId = useProfileStore((s) => s.userId);

  const [editing, setEditing] = useState(false);
  // Default tab is mode-aware: hiring → Active Job Posts, seeker → Experience Videos
  const [tab, setTab] = useState<"experience" | "open_to_work" | "hiring_posts" | "community" | "workplace">(
    "experience",
  );
  const [listMode, setListMode] = useState<"followers" | "following" | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Always open profile from the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Open Edit Profile when navigated with ?edit=1 (e.g. from Settings)
  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setEditing(true);
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { followers, following } = useFollow(userId);
  const { savedIds } = useSavedJobs();
  const [appsCount, setAppsCount] = useState<number>(0);
  const { mode } = useUserMode();
  const isHiring = mode === "hiring";

  // Pick a sensible default tab when the active mode resolves / changes.
  useEffect(() => {
    if (isHiring) {
      setTab((cur) =>
        cur === "hiring_posts" || cur === "workplace" || cur === "community"
          ? cur
          : "hiring_posts",
      );
    } else {
      setTab((cur) =>
        cur === "experience" || cur === "open_to_work" || cur === "community"
          ? cur
          : "experience",
      );
    }
  }, [isHiring]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const n = await fetchReceivedApplicationsCount();
      if (!cancelled) setAppsCount(n);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    loadProfileFromDb();
  }, [loadProfileFromDb]);

  // Load this user's real feed posts from the database
  useEffect(() => {
    if (userId) loadMyPostsFromDb();
  }, [userId, loadMyPostsFromDb]);

  const userPosts = userId ? posts.filter((p) => p.userId === userId) : [];

  // In Hiring mode, the displayed avatar/name is the company logo + name.
  const displayAvatar = isHiring
    ? profile.companyLogoUrl || profile.avatarUrl
    : profile.avatarUrl;
  const displayName = isHiring
    ? profile.companyName?.trim() || "Add your company name"
    : profile.name;
  const employerByline = isHiring
    ? employerProfileByline(profile.name, !!profile.companyName?.trim())
    : null;

  const brandEmployerPost = (post: (typeof userPosts)[number]) =>
    brandPostForEmployer(post, {
      name: profile.companyName,
      logoUrl: profile.companyLogoUrl,
      representativeName: profile.name,
    });

  // Scope each post to a single profile section based on its kind.
  const kindOf = (p: typeof userPosts[number]) =>
    p.postKind || (p.tag === "hiring" ? "hiring" : "community");
  const openToWorkPosts = userPosts.filter((p) => kindOf(p) === "open_to_work");
  const hiringPosts = userPosts.filter((p) => kindOf(p) === "hiring" && isActiveJobListing(p));
  const workplacePosts = userPosts.filter((p) => kindOf(p) === "workplace");
  const communityPosts = userPosts.filter((p) => kindOf(p) === "community");

  return (
    <Layout>
      <div className="container py-6 max-w-2xl bg-background">
        {/* ===== JobToday-style header ===== */}
        <header className="bg-background rounded-2xl card-shadow px-5 py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <UserAvatar
                src={displayAvatar}
                name={displayName}
                className="rounded-full flex-shrink-0 !w-[88px] !h-[88px] object-cover ring-2 ring-background"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 min-w-0">
                  <h1 className="text-[22px] leading-tight font-heading font-extrabold text-foreground break-words">
                    {displayName || (isHiring ? "Your company" : "Your name")}
                  </h1>
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0 mt-1.5" />
                </div>
                {employerByline && (
                  <p className="text-sm text-foreground/70 mt-1">{employerByline}</p>
                )}
                <span
                  className={`inline-block mt-2 text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    isHiring ? "bg-hiring text-hiring-foreground" : "bg-accent text-accent-foreground"
                  }`}
                >
                  {isHiring ? "Employer profile" : "Job seeker profile"}
                </span>
                <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="break-words">
                    {[profile.city, profile.country].filter(Boolean).join(", ") || "Add your location"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center -mr-1 -mt-1">
              <Button asChild variant="ghost" size="icon" aria-label="Settings">
                <Link to="/settings">
                  <SettingsIcon className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Followers / Following / Posts */}
          {userId && (
            <div className="grid grid-cols-3 mt-5 border-t border-border/60 pt-4">
              <button
                onClick={() => setListMode("followers")}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <p className="text-base font-heading font-extrabold text-foreground leading-none">{followers}</p>
                <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Followers</p>
              </button>
              <button
                onClick={() => setListMode("following")}
                className="text-center hover:opacity-80 transition-opacity border-x border-border/60"
              >
                <p className="text-base font-heading font-extrabold text-foreground leading-none">{following}</p>
                <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Following</p>
              </button>
              <div className="text-center">
                <p className="text-base font-heading font-extrabold text-foreground leading-none">{userPosts.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Posts</p>
              </div>
            </div>
          )}
        </header>

        {/* ===== Primary CTA (JobToday signature button) ===== */}
        <Link
          to={isHiring ? "/upload?mode=hiring" : "/feed"}
          className="mt-4 flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-full py-3.5 text-sm font-bold tracking-tag hover:opacity-95 transition-opacity card-shadow"
        >
          {isHiring ? <><Plus className="w-4 h-4" /> Post a job</> : <><Search className="w-4 h-4" /> Find a job</>}
        </Link>

        {/* ===== Quick action tiles (JobToday "Saved / Applications") ===== */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {isHiring ? (
            <>
              <TileLink to="/my-jobs" icon={<Briefcase className="w-5 h-5" />} title="My Jobs" value={appsCount === 0 ? "Manage posts" : `${appsCount} applicants`} />
              <TileLink to="/messages" icon={<MessageSquare className="w-5 h-5" />} title="Messages" value="Chat with applicants" />
            </>
          ) : (
            <>
              <TileLink to="/saved" icon={<Bookmark className="w-5 h-5" />} title="Saved" value={`${savedIds.size} ${savedIds.size === 1 ? "job" : "jobs"}`} />
              <TileLink to="/applications" icon={<Inbox className="w-5 h-5" />} title="Applications" value="Track status" />
            </>
          )}
        </div>

        {/* ===== Video CV (Job Seeker) — the heart of the video-based concept ===== */}
        {!isHiring && (
          <section className="mt-5 bg-background rounded-2xl card-shadow overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-2">
                <VideoIcon className="w-4 h-4 text-primary" />
                <h2 className="font-heading font-extrabold text-foreground text-[15px]">Video CV</h2>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-bold text-primary hover:underline tracking-tag"
              >
                {profile.introVideoUrl ? "Replace" : "Add"}
              </button>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PROFILE_VIDEO_CV_GUIDANCE.description}
              </p>
              {profile.introVideoUrl ? (
                <video src={profile.introVideoUrl} controls className="w-full rounded-xl aspect-video bg-black" />
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-2 hover:bg-muted/70 transition-colors border border-border/60"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{PROFILE_VIDEO_CV_GUIDANCE.emptyCta}</p>
                  </button>
                  <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3">
                    <p className="text-xs font-semibold text-foreground mb-2">What to say in your video</p>
                    <ul className="space-y-1.5">
                      {PROFILE_VIDEO_CV_GUIDANCE.tips.map((tip) => (
                        <li key={tip} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== About / Bio ===== */}
        {!isHiring && (
          <Section
            title="About"
            icon={<FileText className="w-4 h-4" />}
            action={
              <button onClick={() => setEditing(true)} className="text-xs font-bold text-primary hover:underline tracking-tag">
                Edit
              </button>
            }
          >
            {profile.bio ? (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <EmptyHint text="Add a bio in Edit Profile, or upload a PDF in Resume below to fill it automatically." />
            )}
          </Section>
        )}

        {!isHiring && <JobSeekerResumeSection variant="profile" />}

        {/* ===== Company (Hiring) ===== */}
        {isHiring && (
          <Section
            title="About the company"
            icon={<Building2 className="w-4 h-4" />}
            action={
              <button onClick={() => setEditing(true)} className="text-xs font-bold text-primary hover:underline tracking-tag">
                Edit
              </button>
            }
          >
            {profile.companyName || profile.companyDescription ? (
              <>
                {profile.companyName && (
                  <p className="font-heading font-bold text-foreground">{profile.companyName}</p>
                )}
                {profile.companyDescription && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                    {profile.companyDescription}
                  </p>
                )}
                <CompanySocialLinks profile={profile} />
              </>
            ) : (
              <EmptyHint text="Add your company name and description from Edit Profile." />
            )}
          </Section>
        )}

        {/* ===== Videos tabs ===== */}
        <div className="mt-6 px-1">
          <h2 className="font-heading font-extrabold text-foreground text-[15px] mb-3 flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-primary" /> Your videos
          </h2>
        </div>
        <div className="flex gap-6 border-b border-border overflow-x-auto no-scrollbar">
          {isHiring ? (
            <>
              <TabBtn active={tab === "hiring_posts"} onClick={() => setTab("hiring_posts")}>
                Active Job Posts ({hiringPosts.length})
              </TabBtn>
              <TabBtn active={tab === "workplace"} onClick={() => setTab("workplace")}>
                Workplace Videos ({workplacePosts.length})
              </TabBtn>
              <TabBtn active={tab === "community"} onClick={() => setTab("community")}>
                Community Posts ({communityPosts.length})
              </TabBtn>
            </>
          ) : (
            <>
              <TabBtn active={tab === "experience"} onClick={() => setTab("experience")}>
                Experience Videos ({experiences.length})
              </TabBtn>
              <TabBtn active={tab === "open_to_work"} onClick={() => setTab("open_to_work")}>
                Open to Work ({openToWorkPosts.length})
              </TabBtn>
              <TabBtn active={tab === "community"} onClick={() => setTab("community")}>
                Community Posts ({communityPosts.length})
              </TabBtn>
            </>
          )}
        </div>

        {/* Content */}
        <div className="mt-6 space-y-4">
          {tab === "experience" && !isHiring && (
            <>
              <div className="flex justify-end">
                <AddExperienceButton />
              </div>
              {experiences.length === 0 ? (
                <ProfileVideosEmptyState kind="experience" />
              ) : (
                experiences.map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} onDelete={async () => {
                    const { error } = await removeExperience(exp.id);
                    if (error) return toast.error(error);
                    toast.success("Experience removed");
                  }} />
                ))
              )}
            </>
          )}

          {tab === "workplace" && isHiring && (
            workplacePosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {workplacePosts.map((post) => (
                  <VideoPostCard key={post.id} post={brandEmployerPost(post)} />
                ))}
              </div>
            ) : (
              <ProfileVideosEmptyState kind="workplace" />
            )
          )}

          {tab === "open_to_work" && !isHiring && (
            openToWorkPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {openToWorkPosts.map((post) => (
                  <VideoPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <ProfileVideosEmptyState kind="open_to_work" />
            )
          )}

          {tab === "hiring_posts" && isHiring && (
            hiringPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {hiringPosts.map((post) => (
                  <VideoPostCard key={post.id} post={brandEmployerPost(post)} />
                ))}
              </div>
            ) : (
              <ProfileVideosEmptyState kind="hiring" />
            )
          )}

          {tab === "community" && (
            <>
              <CommunityPostInfoBanner
                text={communityPostVisibilityCopy(isHiring ? "hiring" : "job_seeker")}
                className="mb-4"
              />
              {communityPosts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {communityPosts.map((post) => (
                    <VideoPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <ProfileVideosEmptyState kind="community" />
              )}
            </>
          )}
        </div>
      </div>

      <EditProfileSheet open={editing} onOpenChange={setEditing} />

      {listMode && userId && (
        <FollowListDialog
          open={!!listMode}
          onOpenChange={(o) => !o && setListMode(null)}
          userId={userId}
          mode={listMode}
        />
      )}
    </Layout>
  );
};

const Section = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mt-4 bg-background rounded-2xl px-5 py-5 card-shadow">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-heading font-extrabold text-foreground text-[15px] flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const TileLink = ({
  to,
  icon,
  title,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  value: string;
}) => (
  <Link
    to={to}
    className="bg-background rounded-2xl p-4 card-shadow flex flex-col gap-2 hover:bg-muted/40 transition-colors"
  >
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
      {icon}
    </div>
    <p className="font-heading font-bold text-sm text-foreground leading-tight">{title}</p>
    <p className="text-[11px] text-muted-foreground -mt-1">{value}</p>
  </Link>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground">{text}</p>
);

const TabBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`relative pb-3 pt-1 text-sm font-semibold whitespace-nowrap transition-colors ${
      active
        ? "text-foreground after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-primary"
        : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const ExperienceCard = ({ experience, onDelete }: { experience: Experience; onDelete: () => void }) => {
  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const dateRange = (
    <>
      <span>{formatDate(experience.startDate)}</span>
      <span className="mx-1">to</span>
      {experience.isCurrent ? (
        <span className="inline-flex items-center gap-1 text-accent font-medium">
          <CheckCircle className="w-3 h-3" /> Present
        </span>
      ) : (
        <span>{experience.endDate ? formatDate(experience.endDate) : ""}</span>
      )}
    </>
  );

  return (
    <article className="bg-card rounded-xl card-shadow overflow-hidden">
      {experience.videoUrl ? (
        <div className="relative aspect-video bg-black">
          <SecureVideo
            src={experience.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-card/90 flex items-center justify-center shadow-md">
            <Play className="w-6 h-6 text-muted-foreground ml-0.5" />
          </div>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-card-foreground leading-tight truncate">
              {experience.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{experience.company}</p>
          </div>
          <div className="flex items-center -mr-2 -mt-1">
            <ExperienceDialog
              initial={experience}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit experience">
                  <Pencil className="w-4 h-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete experience">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this experience?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove "{experience.title}" from your profile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-border/60">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {dateRange}
          </div>
          <span className="inline-block text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">
            {experience.category}
          </span>
        </div>
      </div>
    </article>
  );
};

export default Profile;
