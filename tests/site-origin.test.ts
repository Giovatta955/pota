import { describe, it, expect } from "vitest";
import { siteOrigin } from "@/lib/site-origin";

describe("siteOrigin", () => {
  it("usa l'indirizzo pubblico, non quello interno del deploy", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://studiokore.netlify.app/";
    expect(siteOrigin(new Request("https://abc123--studiokore.netlify.app/auth/confirm"))).toBe("https://studiokore.netlify.app");
  });
  it("senza variabile ripiega sull'origine della richiesta", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteOrigin(new Request("http://localhost:3000/x"))).toBe("http://localhost:3000");
  });
});
