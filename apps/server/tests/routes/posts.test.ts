/**
 * Post routes integration tests.
 * Tests HTTP layer with real Postgres database.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { Pool } from "pg";

import { createApp } from "../../src/app";
import type { User } from "../../src/repositories/user-repository";
import { closePool, createTestDbContext, truncateTables, type TestDbContext } from "../helpers/postgres";

describe("POST /posts", () => {
  let ctx: TestDbContext;
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let testUser: User;

  beforeAll(async () => {
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

  /**
   * Helper to create a test user before each test that needs one.
   */
  const createTestUser = async (): Promise<User> => {
    const result = await ctx.userRepository.create({
      name: "Test Author",
      email: `author-${Date.now()}@example.com`,
    });

    if (result.isErr()) {
      throw new Error(`Failed to create test user: ${result.error.message}`);
    }

    return result.value;
  };

  describe("successful requests", () => {
    it("should create a post and return 201", async () => {
      testUser = await createTestUser();

      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Post",
          content: "This is the content of the test post.",
          authorId: testUser.id,
        }),
      });

      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        data: { id: string; title: string; content: string; authorId: string };
      };

      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe("Test Post");
      expect(body.data.content).toBe("This is the content of the test post.");
      expect(body.data.authorId).toBe(testUser.id);
    });
  });

  describe("validation errors", () => {
    it("should return 400 for missing title", async () => {
      testUser = await createTestUser();

      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Content without title",
          authorId: testUser.id,
        }),
      });

      expect(response.status).toBe(400);

      const body = (await response.json()) as { type: string; errors: unknown[] };

      expect(body.type).toBe("urn:app:error:validation");
      expect(body.errors).toBeDefined();
    });

    it("should return 400 for missing content", async () => {
      testUser = await createTestUser();

      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Title without content",
          authorId: testUser.id,
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing authorId", async () => {
      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Post Title",
          content: "Post content",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty title", async () => {
      testUser = await createTestUser();

      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          content: "Some content",
          authorId: testUser.id,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("not found errors", () => {
    it("should return 404 for non-existent author", async () => {
      const response = await app.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Post Title",
          content: "Post content",
          authorId: "non-existent-user-id",
        }),
      });

      expect(response.status).toBe(404);

      const body = (await response.json()) as { type: string };
      expect(body.type).toBe("urn:app:error:not-found");
    });
  });
});
