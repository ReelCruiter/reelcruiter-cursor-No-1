import Layout from "@/components/Layout";
import type { Experience, VideoPost } from "@/lib/models";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Briefcase,
  Calendar,
  CheckCircle,
  MapPin,
  MessageSquare,
  UserPlus,
  UserCheck,
  BadgeCheck,
  Video as VideoIcon,
  FileText,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import VideoPostCard from "@/components/VideoPostCard";
import BlockReportMenu from "@/components/BlockReportMenu";
import UserAvatar from "@/components/UserAvatar";
import SecureVideo from "@/components/SecureVideo";
import ResumePdfCard from "@/components/ResumePdfCard";
import { isHiringProfile } from "@/lib/avatarDisplay";
import LastActiveLabel from "@/components/LastActiveLabel";
import { communityPostPublicProfileCopy } from "@/lib/communityPostCopy";
import CommunityPostInfoBanner from "@/components/CommunityPostInfoBanner";
import ProfileVideosEmptyState from "@/components/ProfileVideosEmptyState";
import { PROFILE_INTRO_VIDEO_GUIDANCE } from "@/lib/uploadVideoGuidance";
import FollowListDialog from "@/components/FollowListDialog";
import { useFollow } from "@/lib/follows";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserPosts, brandPostForEmployer, employerProfileByline } from "@/lib/posts";
import { isActiveJobListing } from "@/lib/applications";
import { fetchUserExperiences } from "@/lib/experiences";
import {
  IconLinkedin,
  IconTwitter,
  IconInstagram,
  IconFacebook,
  IconTiktok,
  IconYoutube,
  IconWhatsapp,
} from "@/components/SocialIcons";

type PublicProfile = {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  role: string | null;
  active_mode?: string | null;
  company_name?: string | null;
  company_description?: string | null;
  company_logo_url?: string | null;
  company_linkedin?: string | null;
  company_twitter?: string | null;
  company_instagram?: string | null;
  company_facebook?: string | null;
  company_tiktok?: string | null;
  company_youtube?: string | null;
  company_whatsapp?: string | null;
  intro_video_url?: string | null;
  resume_url?: string | null;
  last_active_at?: string | null;
};

type ProfileTab = "experience" | "open_to_work" | "hiring_posts" | "community" | "workplace";

const normalizeUrl = (u: string) => {
  const v = u.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

const whatsappLink = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};

const resumeFileName = (url: string) => {
  try {
    const part = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
    return part && part.includes(".") ? part : "Resume.pdf";
  } catch {
    return "Resume.pdf";
  }
};

const CompanySocialLinks = ({ profile }: { profile: PublicProfile }) => {
  const links = [
    { key: "linkedin", url: normalizeUrl(profile.company_linkedin || ""), Icon: IconLinkedin, label: "LinkedIn", color: "#0A66C2" },
    { key: "instagram", url: normalizeUrl(profile.company_instagram || ""), Icon: IconInstagram, label: "Instagram", color: "#E4405F" },
    { key: "facebook", url: normalizeUrl(profile.company_facebook || ""), Icon: IconFacebook, label: "Facebook", color: "#1877F2" },
    { key: "tiktok", url: normalizeUrl(profile.company_tiktok || ""), Icon: IconTiktok, label: "TikTok", color: "currentColor" },
    { key: "youtube", url: normalizeUrl(profile.company_youtube || ""), Icon: IconYoutube, label: "YouTube", color: "#FF0000" },
    { key: "twitter", url: normalizeUrl(profile.company_twitter || ""), Icon: IconTwitter, label: "X", color: "currentColor" },
    { key: "whatsapp", url: whatsappLink(profile.company_whatsapp || ""), Icon: IconWhatsapp, label: "WhatsApp", color: "#25D366" },
  ].filter((l) => l.url.length > 0);

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

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProfileTab>("experience");
  const [listMode, setListMode] = useState<"followers" | "following" | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [userPosts, setUserPosts] = useState<VideoPost[]>([]);
  const [userExperiences, setUserExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [userId]);

  const { followers, following, isFollowing, isSelf, currentUserId, loading, follow, unfollow } = useFollow(userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      const profileFields =
        "full_name, avatar_url, bio, location, role, active_mode, company_name, company_description, company_logo_url, company_linkedin, company_twitter, company_instagram, company_facebook, company_tiktok, company_youtube, company_whatsapp, intro_video_url, resume_url, last_active_at";

      const [{ data: prof, error: profErr }, posts, exps] = await Promise.all([
        supabase.from("profiles").select(profileFields).eq("user_id", userId).maybeSingle(),
        fetchUserPosts(userId),
        fetchUserExperiences(userId),
      ]);
      if (cancelled) return;
      if (profErr) console.error("UserProfile profile fetch error", profErr);

      setProfile(prof ?? null);
      setUserPosts(posts);
      setUserExperiences(exps);
      setLoadingProfile(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const fallback = userPosts[0];
  const role = profile?.role || (fallback?.tag === "hiring" ? "hiring" : "job_seeker");
  const isHiring = isHiringProfile(
    profile ? { active_mode: profile.active_mode, role: profile.role ?? role } : { role }
  );
  const displayName = isHiring
    ? profile?.company_name?.trim() || profile?.full_name || fallback?.userName || "Member"
    : profile?.full_name || fallback?.userName || "Member";
  const employerByline = isHiring
    ? employerProfileByline(profile?.full_name, !!profile?.company_name?.trim())
    : null;
  const displayAvatar = isHiring
    ? profile?.company_logo_url || profile?.avatar_url || fallback?.userAvatar || ""
    : profile?.avatar_url || fallback?.userAvatar || "";
  const displayBio = profile?.bio || fallback?.description || "";
  const introVideoUrl = profile?.intro_video_url || "";
  const resumeUrl = profile?.resume_url || "";

  const [city, country] = (profile?.location || "").split(",").map((s) => s.trim());
  const displayCity = city || fallback?.location.city || "";
  const displayCountry = country || fallback?.location.country || "";

  const tagStyles = isHiring
    ? "bg-hiring text-hiring-foreground"
    : "bg-accent text-accent-foreground";

  const kindOf = (p: VideoPost) =>
    p.postKind || (p.tag === "hiring" ? "hiring" : "community");
  const openToWorkPosts = userPosts.filter((p) => kindOf(p) === "open_to_work");
  const hiringPosts = userPosts.filter((p) => kindOf(p) === "hiring" && isActiveJobListing(p));
  const workplacePosts = userPosts.filter((p) => kindOf(p) === "workplace");
  const communityPosts = userPosts.filter((p) => kindOf(p) === "community");

  const brandEmployerPost = (post: VideoPost) =>
    isHiring
      ? brandPostForEmployer(post, {
          name: profile?.company_name || undefined,
          logoUrl: profile?.company_logo_url || undefined,
          representativeName: profile?.full_name || undefined,
        })
      : post;

  useEffect(() => {
    if (isHiring) {
      setTab((cur) =>
        cur === "hiring_posts" || cur === "workplace" || cur === "community" ? cur : "hiring_posts"
      );
    } else {
      setTab((cur) =>
        cur === "experience" || cur === "open_to_work" || cur === "community" ? cur : "experience"
      );
    }
  }, [isHiring, userId]);

  const onFollowClick = async () => {
    if (!currentUserId) {
      toast.error("Sign in to follow users");
      navigate("/signin", { state: { from: `/user/${userId}` } });
      return;
    }
    const { error } = isFollowing ? await unfollow() : await follow();
    if (error) toast.error(error);
  };

  if (loadingProfile) {
    return (
      <Layout>
        <div className="container py-20 text-center text-muted-foreground">Loading profile…</div>
      </Layout>
    );
  }

  if (!profile && userPosts.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-lg text-muted-foreground">User not found</p>
          <button onClick={() => navigate("/feed")} className="mt-4 text-primary hover:underline text-sm">
            Back to Feed
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <header className="bg-background rounded-2xl card-shadow px-5 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <UserAvatar
                src={displayAvatar}
                name={displayName}
                className="rounded-full flex-shrink-0 !w-[72px] !h-[72px] sm:!w-[88px] sm:!h-[88px] object-cover ring-2 ring-background"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 min-w-0">
                  <h1 className="text-xl sm:text-[22px] leading-tight font-heading font-extrabold text-foreground break-words min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {displayName}
                  </h1>
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                </div>
                {employerByline && (
                  <p className="text-sm text-foreground/70 mt-1 break-words">{employerByline}</p>
                )}
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${tagStyles}`}>
                  {isHiring ? "Employer profile" : "Job seeker profile"}
                </span>
                {(displayCity || displayCountry) && (
                  <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="break-words">
                      {[displayCity, displayCountry].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {!isSelf && <LastActiveLabel at={profile?.last_active_at} className="mt-2" />}
              </div>
            </div>

            {!isSelf && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-shrink-0 sm:justify-end">
                <Button
                  onClick={onFollowClick}
                  disabled={loading}
                  variant={isFollowing ? "secondary" : "default"}
                  size="sm"
                  className="flex-1 min-w-[7rem] sm:flex-none"
                >
                  {isFollowing ? (
                    <><UserCheck className="w-4 h-4 mr-1.5" /> Following</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-1.5" /> Follow</>
                  )}
                </Button>
                <Link
                  to={`/messages?to=${userId}`}
                  className="flex flex-1 min-w-[7rem] sm:flex-none items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Link>
                <BlockReportMenu
                  targetUserId={userId!}
                  targetUserName={displayName}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 mt-5 border-t border-border/60 pt-4">
            <button onClick={() => setListMode("followers")} className="text-center hover:opacity-80 transition-opacity">
              <p className="text-base font-heading font-extrabold text-foreground leading-none">{followers}</p>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Followers</p>
            </button>
            <button onClick={() => setListMode("following")} className="text-center hover:opacity-80 transition-opacity border-x border-border/60">
              <p className="text-base font-heading font-extrabold text-foreground leading-none">{following}</p>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Following</p>
            </button>
            <div className="text-center">
              <p className="text-base font-heading font-extrabold text-foreground leading-none">{userPosts.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tag">Posts</p>
            </div>
          </div>
        </header>

        {/* Intro video */}
        {!isHiring && introVideoUrl && (
          <section className="mt-5 bg-background rounded-2xl card-shadow overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5">
              <VideoIcon className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-extrabold text-foreground text-[15px]">
                {PROFILE_INTRO_VIDEO_GUIDANCE.sectionTitle}
              </h2>
            </div>
            <div className="px-5 pb-5 pt-3">
              <SecureVideo
                src={introVideoUrl}
                streamDirectly
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl aspect-video bg-black object-contain"
              />
            </div>
          </section>
        )}

        {/* Resume PDF — show whenever a CV was uploaded (job seeker content) */}
        {resumeUrl && (
          <ResumePdfCard url={resumeUrl} fileName={resumeFileName(resumeUrl)} variant="public" />
        )}

        {/* About */}
        {displayBio && (
          <Section title="About" icon={<FileText className="w-4 h-4" />}>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{displayBio}</p>
          </Section>
        )}

        {/* Company */}
        {isHiring && (profile?.company_name || profile?.company_description) && (
          <Section title="About the company" icon={<Building2 className="w-4 h-4" />}>
            {profile?.company_name && (
              <p className="font-heading font-bold text-foreground">{profile.company_name}</p>
            )}
            {profile?.company_description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                {profile.company_description}
              </p>
            )}
            {profile && <CompanySocialLinks profile={profile} />}
          </Section>
        )}

        {/* Video tabs */}
        <div className="mt-6 px-1">
          <h2 className="font-heading font-extrabold text-foreground text-[15px] mb-3 flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-primary" />
            Videos
          </h2>
        </div>
        <div className="flex gap-6 border-b border-border overflow-x-auto no-scrollbar">
          {isHiring ? (
            <>
              <TabBtn active={tab === "hiring_posts"} onClick={() => setTab("hiring_posts")}>
                Job Posts ({hiringPosts.length})
              </TabBtn>
              <TabBtn active={tab === "workplace"} onClick={() => setTab("workplace")}>
                Workplace ({workplacePosts.length})
              </TabBtn>
              <TabBtn active={tab === "community"} onClick={() => setTab("community")}>
                Community ({communityPosts.length})
              </TabBtn>
            </>
          ) : (
            <>
              <TabBtn active={tab === "experience"} onClick={() => setTab("experience")}>
                Experience ({userExperiences.length})
              </TabBtn>
              <TabBtn active={tab === "open_to_work"} onClick={() => setTab("open_to_work")}>
                Open to Work ({openToWorkPosts.length})
              </TabBtn>
              <TabBtn active={tab === "community"} onClick={() => setTab("community")}>
                Community ({communityPosts.length})
              </TabBtn>
            </>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {tab === "experience" && !isHiring && (
            userExperiences.length > 0 ? (
              userExperiences.map((exp) => <ExperienceCard key={exp.id} experience={exp} />)
            ) : isSelf ? (
              <ProfileVideosEmptyState kind="experience" />
            ) : (
              <EmptyHint text="No experience videos yet." />
            )
          )}

          {tab === "open_to_work" && !isHiring && (
            openToWorkPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {openToWorkPosts.map((post) => (
                  <VideoPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : isSelf ? (
              <ProfileVideosEmptyState kind="open_to_work" />
            ) : (
              <EmptyHint text="No Open to Work posts yet." />
            )
          )}

          {tab === "hiring_posts" && isHiring && (
            hiringPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {hiringPosts.map((post) => (
                  <VideoPostCard key={post.id} post={brandEmployerPost(post)} />
                ))}
              </div>
            ) : isSelf ? (
              <ProfileVideosEmptyState kind="hiring" />
            ) : (
              <EmptyHint text="No active job posts yet." />
            )
          )}

          {tab === "workplace" && isHiring && (
            workplacePosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {workplacePosts.map((post) => (
                  <VideoPostCard key={post.id} post={brandEmployerPost(post)} />
                ))}
              </div>
            ) : isSelf ? (
              <ProfileVideosEmptyState kind="workplace" />
            ) : (
              <EmptyHint text="No workplace videos yet." />
            )
          )}

          {tab === "community" && (
            <>
              <CommunityPostInfoBanner text={communityPostPublicProfileCopy} className="mb-4" />
              {communityPosts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {communityPosts.map((post) => (
                    <VideoPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : isSelf ? (
                <ProfileVideosEmptyState kind="community" />
              ) : (
                <EmptyHint text="No community posts yet." />
              )}
            </>
          )}
        </div>
      </div>

      {listMode && (
        <FollowListDialog
          open={!!listMode}
          onOpenChange={(o) => !o && setListMode(null)}
          userId={userId!}
          mode={listMode}
        />
      )}
    </Layout>
  );
};

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mt-4 bg-background rounded-2xl px-5 py-5 card-shadow">
    <h2 className="font-heading font-extrabold text-foreground text-[15px] flex items-center gap-2 mb-3">
      {icon && <span className="text-primary">{icon}</span>}
      {title}
    </h2>
    {children}
  </section>
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

const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground text-center py-12">{text}</p>
);

const ExperienceCard = ({ experience }: { experience: Experience }) => {
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
            streamDirectly
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

export default UserProfile;
