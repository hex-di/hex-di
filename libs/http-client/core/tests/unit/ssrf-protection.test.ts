import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { withSsrfProtection } from "../../src/combinators/security/ssrf-protection.js";

describe("SSRF protection", () => {
  it("private IP addresses are blocked when SSRF protection is enabled", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = withSsrfProtection()(base);

    // 10.x.x.x
    const result10 = await client.get("http://10.0.0.1/api/data");
    expect(result10._tag).toBe("Err");
    if (result10._tag === "Err") {
      expect(result10.error.reason).toBe("Transport");
      expect(result10.error.message).toContain("SSRF protection");
    }

    // 192.168.x.x
    const result192 = await client.get("http://192.168.1.1/api/data");
    expect(result192._tag).toBe("Err");

    // 172.16-31.x.x
    const result172 = await client.get("http://172.16.0.1/api/data");
    expect(result172._tag).toBe("Err");
  });

  it("loopback addresses are blocked when SSRF protection is enabled", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = withSsrfProtection()(base);

    const result127 = await client.get("http://127.0.0.1/api/data");
    expect(result127._tag).toBe("Err");
    if (result127._tag === "Err") {
      expect(result127.error.message).toContain("SSRF protection");
      expect(result127.error.message).toContain("private");
    }

    const resultLocalhost = await client.get("http://localhost/api/data");
    expect(resultLocalhost._tag).toBe("Err");
  });

  it("link-local addresses are blocked", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = withSsrfProtection()(base);

    const result = await client.get("http://169.254.1.1/api/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("link-local");
    }
  });

  it("metadata service endpoints are blocked", async () => {
    const base = createMockHttpClient({
      "* /computeMetadata/v1": { status: 200 },
    });
    const client = withSsrfProtection()(base);

    // GCP metadata service (not a link-local address, goes through metadata check)
    const resultGcp = await client.get("http://metadata.google.internal/computeMetadata/v1");
    expect(resultGcp._tag).toBe("Err");
    if (resultGcp._tag === "Err") {
      expect(resultGcp.error.message).toContain("metadata");
    }

    // AWS metadata service (169.254.169.254 is link-local, blocked by link-local check)
    const resultAws = await client.get("http://169.254.169.254/latest/meta-data");
    expect(resultAws._tag).toBe("Err");
    if (resultAws._tag === "Err") {
      expect(resultAws.error.message).toContain("SSRF protection");
    }

    // metadata.goog
    const resultGoog = await client.get("http://metadata.goog/computeMetadata/v1");
    expect(resultGoog._tag).toBe("Err");
    if (resultGoog._tag === "Err") {
      expect(resultGoog.error.message).toContain("metadata");
    }
  });

  it("allowed domains override SSRF blocking", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = withSsrfProtection({
      allowedDomains: ["10.0.0.1"],
    })(base);

    // 10.0.0.1 is normally blocked but is in the allowedDomains list
    const result = await client.get("http://10.0.0.1/api/data");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});
