export interface VideoPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTitle: string;
  tag: "job-seeker" | "hiring";
  postKind?: "open_to_work" | "community" | "hiring" | "workplace";
  description: string;
  category: string;
  jobTitle: string;
  location: { city: string; country: string };
  jobType: "full-time" | "part-time" | "contract" | "freelance" | "internship";
  salary?: string;
  videoUrl: string;
  thumbnail: string;
  likes: number;
  comments: number;
  saved: boolean;
  createdAt: string;
  daysAgo: number;
  createdAtIso?: string;
  isPublic?: boolean;
  hiddenFromFeed?: boolean;
  workArrangement?: "remote" | "hybrid" | "onsite";
  experienceLevel?: string;
  openings?: number;
  applyUrl?: string;
  deadline?: string;
  fullAddress?: string;
  addressVisibility?: "full" | "area" | "hidden";
  desiredRole?: string;
  preferredLocation?: string;
  immediateStart?: boolean;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  videoUrl: string;
  category: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  messages: Message[];
}

export const categories = ["Engineering", "Design", "Marketing", "Data Science", "Product", "Sales", "Other"];
export const jobTypes: VideoPost["jobType"][] = ["full-time", "part-time", "contract", "freelance", "internship"];

export const jobTypeLabels: Record<VideoPost["jobType"], string> = {
  "full-time": "Full time",
  "part-time": "Part time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

/** @deprecated Use locations.ts — kept for backwards compatibility */
export const countries = ["United States", "United Kingdom", "Germany", "Canada", "Australia", "France", "Netherlands", "India"];
export const cities: Record<string, string[]> = {
  "United States": ["New York", "San Francisco", "Austin", "Seattle", "Chicago", "Los Angeles"],
  "United Kingdom": ["London", "Manchester", "Edinburgh", "Bristol"],
  Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt"],
  Canada: ["Toronto", "Vancouver", "Montreal"],
  Australia: ["Sydney", "Melbourne", "Brisbane"],
  France: ["Paris", "Lyon", "Marseille"],
  Netherlands: ["Amsterdam", "Rotterdam", "The Hague"],
  India: ["Bangalore", "Mumbai", "Delhi", "Hyderabad"],
};

export const emptyPosts: VideoPost[] = [];
export const emptyExperiences: Experience[] = [];
export const emptyConversations: Conversation[] = [];
