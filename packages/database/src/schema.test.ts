import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auditLogs, offers, products, publicationJobs, publications } from "./schema";

describe("database schema", () => {
  it("exposes the core persistence tables", () => {
    expect([products, offers, publicationJobs, publications, auditLogs].map(getTableName)).toEqual([
      "products", "offers", "publication_jobs", "publications", "audit_logs",
    ]);
  });

  it("uses string-backed numeric values to avoid floating-point money", () => {
    expect(offers.price.dataType).toBe("string");
  });
});
