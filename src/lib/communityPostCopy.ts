type CommunityPostAudience = "hiring" | "job_seeker";

const COMMUNITY_INTRO = "Share advice, updates, or general content here.";
const COMMUNITY_FEED =
  "Community Posts appear in the feed for both job seekers and employers.";

export const communityPostVisibilityCopy = (audience: CommunityPostAudience): string => {
  const scoped =
    audience === "hiring"
      ? "Job posts and workplace videos are only visible to job seekers."
      : "Open to Work and Experience videos are only visible to employers.";
  return `${COMMUNITY_INTRO} ${COMMUNITY_FEED} ${scoped}`;
};

export const communityPostPublicProfileCopy =
  "Community Posts appear in the feed for both job seekers and employers.";
