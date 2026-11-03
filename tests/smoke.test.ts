import { describe, it, expect } from "vitest";
import { config } from "@/lib/config";

describe("config", () => {
  it("il mix livelli esame somma a 1", () => {
    const sum = config.exam.levelMix.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
});
