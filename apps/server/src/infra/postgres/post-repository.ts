/**
 * Postgres Post Repository implementation using Drizzle ORM.
 */

import { eq } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";

import { posts } from "@bun-hono-ddd-template/db";

import { unexpectedError } from "../../domain/shared/errors";
import type { CreatePostInput, Post, PostRepository, PostRepositoryError } from "../../repositories/post-repository";
import type { Database } from "./db";

/**
 * Map database row to Post entity.
 */
const toPost = (row: typeof posts.$inferSelect): Post => ({
  id: row.id,
  title: row.title,
  content: row.content,
  authorId: row.authorId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
});

/**
 * Create a Postgres Post Repository.
 *
 * @param db - Drizzle database instance
 * @returns PostRepository implementation
 */
export const createPostgresPostRepository = (db: Database): PostRepository => ({
  async findById(id: string): Promise<Result<Post | null, PostRepositoryError>> {
    try {
      const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

      return ok(result[0] ? toPost(result[0]) : null);
    } catch (error) {
      return err(unexpectedError("Failed to find post by id", error));
    }
  },

  async create(input: CreatePostInput): Promise<Result<Post, PostRepositoryError>> {
    try {
      const result = await db
        .insert(posts)
        .values({
          title: input.title,
          content: input.content,
          authorId: input.authorId,
        })
        .returning();

      const created = result[0];

      if (!created) {
        return err(unexpectedError("Post creation returned no result"));
      }

      return ok(toPost(created));
    } catch (error) {
      return err(unexpectedError("Failed to create post", error));
    }
  },
});
