import { describe, expect, test } from "bun:test"

import { API_BASE, proxiedImageUrl } from "@/lib/bracket-api"

describe("proxiedImageUrl", () => {
  test("wraps the S3 url through the image proxy with encoding", () => {
    const src = "https://s3-sa-east-1.amazonaws.com/robocore-robos/4178/4178_1_L.jpg?20250827131204"
    expect(proxiedImageUrl(src)).toBe(`${API_BASE}/img?src=${encodeURIComponent(src)}`)
    expect(proxiedImageUrl(src)).toContain("%3A%2F%2F")
  })
})
