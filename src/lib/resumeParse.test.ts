import { describe, expect, it } from "vitest";
import { parseResumeText } from "@/lib/resumeParse";
import { resolveCityCountry } from "@/lib/locationResolve";

describe("parseResumeText header", () => {
  it("parses name and Dutch city pair on separate lines", () => {
    const text = [
      "Muhammad Abbas",
      "Zaandam, Amsterdam",
      "",
      "Experience",
      "Hotel Receptionist",
      "Grand Hotel | 2020 - Present",
    ].join("\n");

    const parsed = parseResumeText(text);
    expect(parsed.name).toBe("Muhammad Abbas");
    expect(parsed.city).toBe("Zaandam");
    expect(parsed.country).toBe("Netherlands");
  });

  it("parses merged name and location on one line", () => {
    const text = "Muhammad Abbas Zaandam, Amsterdam\n\nExperience\nConcierge\nHotel | 2019 - 2022";
    const parsed = parseResumeText(text);
    expect(parsed.name).toBe("Muhammad Abbas");
    expect(parsed.city).toBe("Zaandam");
    expect(parsed.country).toBe("Netherlands");
  });

  it("does not treat the name as part of the location", () => {
    const text = ["Muhammad Abbas", "Zaandam, Amsterdam", "summary@email.com"].join("\n");
    const parsed = parseResumeText(text);
    expect(parsed.city).not.toContain("Muhammad");
    expect(parsed.country).not.toBe("Zaandam");
  });
});

describe("resolveCityCountry", () => {
  it("maps Zaandam, Amsterdam to Netherlands", () => {
    expect(resolveCityCountry("Zaandam", "Amsterdam")).toEqual({
      city: "Zaandam",
      country: "Netherlands",
    });
  });
});
