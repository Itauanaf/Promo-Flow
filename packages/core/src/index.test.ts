import { describe, expect, it } from "vitest";
import type { IntegrationStatus, Marketplace } from "./index";

describe("shared domain vocabulary", () => {
  it("keeps supported marketplace and integration status values stable", () => {
    const marketplace: Marketplace = "shopee";
    const status: IntegrationStatus = "not_configured";
    expect({ marketplace, status }).toEqual({ marketplace: "shopee", status: "not_configured" });
  });
});
