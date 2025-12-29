/**
 * Post Repository interface.
 * Defines the contract for post persistence.
 * Implementations are in infra/ (postgres, etc.)
 */

import type { Result } from "neverthrow";

import type { NotFoundError, UnexpectedError } from "../domain/shared/errors";

/**
 * Post entity shape (for repository operations).
 */
export interface Post {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly authorId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

/**
 * Input for creating a new post.
 */
export interface CreatePostInput {
  readonly title: string;
  readonly content: string;
  readonly authorId: string;
}

/**
 * Repository error types.
 */
export type PostRepositoryError = NotFoundError | UnexpectedError;

/**
 * Post Repository interface.
 * All methods return Result for consistent error handling.
 */
export interface PostRepository {
  /**
   * Find post by ID.
   * Returns null if not found (not an error).
   */
  findById(id: string): Promise<Result<Post | null, PostRepositoryError>>;

  /**
   * Create a new post.
   */
  create(input: CreatePostInput): Promise<Result<Post, PostRepositoryError>>;
}
