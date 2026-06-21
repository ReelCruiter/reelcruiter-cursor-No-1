export type UploadVideoKind =
  | "hiring"
  | "workplace"
  | "open_to_work"
  | "community_employer"
  | "community_job_seeker";

type VideoGuidance = {
  title: string;
  tips: string[];
};

export const UPLOAD_VIDEO_GUIDANCE: Record<UploadVideoKind, VideoGuidance> = {
  hiring: {
    title: "What to cover in your job video",
    tips: [
      "Introduce the role and your company in a few sentences.",
      "Explain what the person will do day to day.",
      "Describe who would be a great fit for the team.",
      "Mention location, schedule, or standout benefits if helpful.",
    ],
  },
  workplace: {
    title: "What to show in your workplace video",
    tips: [
      "Give a quick tour of your office, site, or team at work.",
      "Show the culture and what it feels like to work there.",
      "Introduce a colleague or walk through a typical day.",
      "Help candidates picture themselves joining your team.",
    ],
  },
  open_to_work: {
    title: "What to say in your Open to Work video",
    tips: [
      "Introduce yourself and the role you are looking for.",
      "Highlight your strongest skills and recent experience.",
      "Share where you want to work or if you are open to remote.",
      "Say what kind of team or company you would love to join.",
    ],
  },
  community_employer: {
    title: "Ideas for your community video",
    tips: [
      "Share hiring tips or lessons from building your team.",
      "Give a behind-the-scenes look at your company.",
      "Talk about your industry, news, or something you are proud of.",
      "Keep it professional and useful for job seekers watching.",
    ],
  },
  community_job_seeker: {
    title: "Ideas for your community video",
    tips: [
      "Share career advice or something you have learned on the job.",
      "Talk about your skills, projects, or what you are working toward.",
      "Motivate others in your field or celebrate a small win.",
      "Speak naturally, as you would to a colleague or mentor.",
    ],
  },
};

export function getUploadVideoGuidance(kind: UploadVideoKind): VideoGuidance {
  return UPLOAD_VIDEO_GUIDANCE[kind];
}

/** Copy for the job seeker profile Video CV section. */
export const PROFILE_VIDEO_CV_GUIDANCE = {
  description:
    "This is your profile intro video. Recruiters watch it to meet you before reading your resume — show your personality, not just your job titles.",
  emptyCta: "Record or upload your video",
  tips: [
    "Start with your name and the kind of role you want",
    "Highlight 2–3 skills or strengths that fit those roles",
    "Briefly mention recent experience or a result you're proud of",
    "Say where you'd like to work — city, remote, or open to relocate",
    "Keep it natural and confident — 30 to 60 seconds is plenty",
  ],
  fileHint: (maxMb: number) =>
    `Best length: 30–60 seconds. MP4, MOV, or WebM, up to ${maxMb}MB.`,
};
