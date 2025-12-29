/**
 * User Repository interface.
 * Defines the contract for user persistence.
 * Implementations are in infra/ (postgres, etc.)
 */

import type { Result } from "neverthrow";

import type { ConflictError, NotFoundError, UnexpectedError } from "../domain/shared/errors";

/**
 * User entity shape (for repository operations).
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: Date | null;
  readonly image: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

/**
 * Input for creating a new user.
 */
export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly image?: string | null;
}

/**
 * Repository error types.
 */
export type UserRepositoryError = NotFoundError | ConflictError | UnexpectedError;

/**
 * User Repository interface.
 * All methods return Result for consistent error handling.
 */
export interface UserRepository {
  /**
   * Find user by ID.
   * Returns null if not found (not an error).
   */
  findById(id: string): Promise<Result<User | null, UserRepositoryError>>;

  /**
   * Find user by email.
   * Returns null if not found (not an error).
   */
  findByEmail(email: string): Promise<Result<User | null, UserRepositoryError>>;

  /**
   * Create a new user.
   * Returns ConflictError if email already exists.
   */
  create(input: CreateUserInput): Promise<Result<User, UserRepositoryError>>;
}
