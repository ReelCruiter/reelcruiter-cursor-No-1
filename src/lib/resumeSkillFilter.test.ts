import { describe, expect, it } from "vitest";
import {
  bioLooksCopiedFromCv,
  isValidProfileSkill,
  sanitizeProfileSkills,
  isAcceptableAiBio,
} from "@/lib/resumeSkillFilter";

describe("isValidProfileSkill", () => {
  it("rejects years and dates", () => {
    expect(isValidProfileSkill("2022")).toBe(false);
    expect(isValidProfileSkill("2019-03")).toBe(false);
    expect(isValidProfileSkill("Jan 2020")).toBe(false);
  });

  it("accepts real competencies", () => {
    expect(isValidProfileSkill("Customer Service")).toBe(true);
    expect(isValidProfileSkill("Team Leadership")).toBe(true);
  });
});

describe("sanitizeProfileSkills", () => {
  it("filters junk and keeps valid skills", () => {
    expect(
      sanitizeProfileSkills([
        "2022",
        "Customer Service",
        "Leadership",
        "Present",
        "Operations Management",
      ])
    ).toEqual(["Customer Service", "Leadership", "Operations Management"]);
  });
});

describe("bioLooksCopiedFromCv", () => {
  it("flags bios that reuse long CV phrases", () => {
    const cv =
      "To secure a responsible career opportunity and fully utilize my training and skills while making a significant contribution.";
    const bio =
      "To secure a responsible career opportunity and fully utilize my training and skills while making a significant contribution to hospitality.";
    expect(bioLooksCopiedFromCv(bio, cv)).toBe(true);
  });
});

describe("isAcceptableAiBio", () => {
  it("rejects contact-heavy bios", () => {
    expect(
      isAcceptableAiBio("Contact me at test@email.com for more about my career in hotels.")
    ).toBe(false);
  });
});
