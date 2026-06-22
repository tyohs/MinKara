import { describe, expect, it } from "vitest";
import { isRoomHost } from "./roomAccess";

describe("isRoomHost", () => {
  it("derives host status from the room owner", () => {
    expect(isRoomHost({ host_id: "host" }, "host")).toBe(true);
    expect(isRoomHost({ host_id: "host" }, "guest")).toBe(false);
  });

  it("does not grant host privileges before identity is ready", () => {
    expect(isRoomHost({ host_id: "host" }, null)).toBe(false);
    expect(isRoomHost(null, "host")).toBe(false);
  });
});
