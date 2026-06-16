import { describe, expect, it } from "vitest";
import { buildProfilePatchFromResume } from "@/lib/applyResumeToProfile";
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

describe("buildProfilePatchFromResume location", () => {
  it("updates city and country from CV even when profile already has location", () => {
    const patch = buildProfilePatchFromResume(baseProfile(), {
      city: "Zaandam",
      country: "Netherlands",
      skills: [],
      experiences: [],
    });

    expect(patch.city).toBe("Zaandam");
    expect(patch.country).toBe("Netherlands");
  });
});
