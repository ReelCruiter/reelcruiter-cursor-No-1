import { describe, expect, it } from "vitest";
import {
  isGarbledBio,
  parseResumeText,
  repairFragmentedLine,
} from "@/lib/resumeParse";
import { buildFallbackBio, inferSkillsFromResume } from "@/lib/resumeSkillInference";
import { buildProfilePatchFromResume, shouldApplyAiBio } from "@/lib/applyResumeToProfile";
import type { ProfileData } from "@/lib/profileStore";

const baseProfile = (): ProfileData => ({
  name: "Jane Doe",
  bio: "",
  city: "London",
  country: "United Kingdom",
  avatarUrl: "",
  companyName: "",
  companyDescription: "",
  companyWebsite: "",
  companyIndustry: "",
  companySize: "",
  companyLogoUrl: "",
  companyLinkedin: "",
  companyTwitter: "",
  companyInstagram: "",
  companyFacebook: "",
  companyTiktok: "",
  companyYoutube: "",
  companyWhatsapp: "",
  introVideoUrl: "",
  resumeUrl: "",
  resumeName: "",
  skills: [],
  education: [],
  certificates: [],
});

describe("repairFragmentedLine", () => {
  it("joins spaced-out PDF characters", () => {
    const line = "M d M o n i r H o s s a i n";
    expect(repairFragmentedLine(line)).toBe("Md Monir Hossain");
  });
});

describe("isGarbledBio", () => {
  it("flags contact-heavy header text", () => {
    expect(
      isGarbledBio(
        "Md Monir Hossain monirrazib13430@gmail.com Mobile: +48787997863 WORK HISTORY SKILLS"
      )
    ).toBe(true);
  });
});

describe("parseResumeText bio", () => {
  it("does not use the CV header as About when no summary section exists", () => {
    const text = [
      "Md Monir Hossain",
      "monirrazib13430@gmail.com",
      "Oliwkowa 22, Lublin, Poland",
      "Mobile: +48787997863",
      "WORK HISTORY",
      "Restaurant Manager",
      "Food Place | 2020 - Present",
    ].join("\n");

    const parsed = parseResumeText(text);
    expect(parsed.bio).toBeUndefined();
  });
});

describe("inferSkillsFromResume", () => {
  it("infers hospitality skills from work history", () => {
    const parsed = parseResumeText(
      [
        "Jane Smith",
        "Experience",
        "Restaurant Manager",
        "Bistro Central | 2018 - Present",
      ].join("\n")
    );

    const skills = inferSkillsFromResume("", parsed);
    expect(skills).toContain("Customer Service");
    expect(skills).toContain("Team Management");
  });
});

describe("buildProfilePatchFromResume AI bio", () => {
  it("applies AI bio to an empty profile", () => {
    const patch = buildProfilePatchFromResume(baseProfile(), {
      skills: [],
      experiences: [],
    }, {
      aiBio:
        "Experienced hospitality professional with a strong background in restaurant operations, team leadership, and guest service.",
    });

    expect(patch.bio).toContain("hospitality professional");
  });

  it("replaces garbled existing bio", () => {
    const profile = {
      ...baseProfile(),
      bio: "M d M o n i r monirrazib13430@gmail.com WORK HISTORY SKILLS",
    };
    expect(shouldApplyAiBio(profile.bio, "A polished professional summary.")).toBe(true);
  });
});

describe("buildFallbackBio", () => {
  it("writes a summary from parsed experience", () => {
    const bio = buildFallbackBio({
      name: "Jane Smith",
      skills: [],
      experiences: [
        {
          title: "Restaurant Manager",
          company: "Bistro Central",
          startDate: "2018-01",
          endDate: null,
          isCurrent: true,
          category: "Hospitality",
        },
      ],
    });

    expect(bio).toContain("Jane Smith");
    expect(bio).toContain("Restaurant Manager");
    expect(bio).toContain("Bistro Central");
  });
});
