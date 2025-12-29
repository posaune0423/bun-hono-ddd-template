/**
 * User routes integration tests.
 * Tests HTTP layer with real Postgres database.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { Pool } from "pg";

import { createApp } from "../../src/app";
import { closePool, createTestDbContext, truncateTables, type TestDbContext } from "../helpers/postgres";

describe("POST /users", () => {
  let ctx: TestDbContext;
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    ctx = createTestDbContext();
    pool = ctx.pool;
    app = createApp({
      userRepository: ctx.userRepository,
      postRepository: ctx.postRepository,
    });
  });

  afterEach(async () => {
    await truncateTables(pool);
  });

  afterAll(async () => {
    await closePool(pool);
  });

  describe("successful requests", () => {
    it("should create a user and return 201", async () => {
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
        }),
      });

      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        data: { id: string; name: string; email: string };
      };

      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe("Test User");
      expect(body.data.email).toBe("test@example.com");
    });

    it("should create a user with image URL", async () => {
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User With Image",
          email: "image@example.com",
          image: "https://example.com/avatar.png",
        }),
      });

      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        data: { id: string; image: string };
      };

      expect(body.data.image).toBe("https://example.com/avatar.png");
    });
  });

  describe("validation errors", () => {
    it("should return 400 for missing name", async () => {
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      expect(response.status).toBe(400);

      const body = (await response.json()) as { type: string; errors: unknown[] };

      expect(body.type).toBe("urn:app:error:validation");
      expect(body.errors).toBeDefined();
    });

    it("should return 400 for invalid email", async () => {
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "invalid-email",
        }),
      });

      expect(response.status).toBe(400);

      const body = (await response.json()) as { type: string };
      expect(body.type).toBe("urn:app:error:validation");
    });

    it("should return 400 for empty name", async () => {
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "test@example.com",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("conflict errors", () => {
    it("should return 409 for duplicate email", async () => {
      // First create a user
      await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "First User",
          email: "duplicate@example.com",
        }),
      });

      // Try to create another user with the same email
      const response = await app.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Second User",
          email: "duplicate@example.com",
        }),
      });

      expect(response.status).toBe(409);

      const body = (await response.json()) as { type: string };
      expect(body.type).toBe("urn:app:error:conflict");
    });
  });
});
