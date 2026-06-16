import { describe, expect, it } from "vitest";
import { findPhoneBoxesInLine, isLikelyPhone } from "@/lib/resumePhoneRedact";

describe("isLikelyPhone", () => {
  it("accepts common phone formats", () => {
    expect(isLikelyPhone("+44 7700 900123")).toBe(true);
    expect(isLikelyPhone("(555) 123-4567")).toBe(true);
    expect(isLikelyPhone("07700 900123")).toBe(true);
  });

  it("rejects dates and short numbers", () => {
    expect(isLikelyPhone("2019-2023")).toBe(false);
    expect(isLikelyPhone("12345")).toBe(false);
    expect(isLikelyPhone("hello@example.com")).toBe(false);
  });
});

describe("findPhoneBoxesInLine", () => {
  it("finds a phone number segment in line text", () => {
    const line = {
      text: "Phone: +44 7700 900123",
      segments: [
        {
          str: "Phone: +44 7700 900123",
          x: 40,
          y: 100,
          width: 180,
          height: 12,
          charStart: 0,
          charEnd: 24,
        },
      ],
    };

    const boxes = findPhoneBoxesInLine(line);
    expect(boxes.length).toBeGreaterThan(0);
  });
});
