/**
 * Postgres User Repository implementation using Drizzle ORM.
 */

import { eq } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";

import { users } from "@bun-hono-ddd-template/db";

import { conflictError, unexpectedError } from "../../domain/shared/errors";
import type { CreateUserInput, User, UserRepository, UserRepositoryError } from "../../repositories/user-repository";
import type { Database } from "./db";

/**
 * Map database row to User entity.
 */
const toUser = (row: typeof users.$inferSelect): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  emailVerified: row.emailVerified,
  image: row.image,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
});

/**
 * Check if error is a Postgres unique violation (code 23505).
 */
const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code: string }).code === "23505";
  }
  return false;
};

/**
 * Create a Postgres User Repository.
 *
 * @param db - Drizzle database instance
 * @returns UserRepository implementation
 */
export const createPostgresUserRepository = (db: Database): UserRepository => ({
  async findById(id: string): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

      return ok(result[0] ? toUser(result[0]) : null);
    } catch (error) {
      return err(unexpectedError("Failed to find user by id", error));
    }
  },

  async findByEmail(email: string): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

      return ok(result[0] ? toUser(result[0]) : null);
    } catch (error) {
      return err(unexpectedError("Failed to find user by email", error));
    }
  },

  async create(input: CreateUserInput): Promise<Result<User, UserRepositoryError>> {
    try {
      const result = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          image: input.image ?? null,
        })
        .returning();

      const created = result[0];

      if (!created) {
        return err(unexpectedError("User creation returned no result"));
      }

      return ok(toUser(created));
    } catch (error) {
      if (isUniqueViolation(error)) {
        return err(
          conflictError(`User with email '${input.email}' already exists`, {
            resource: "User",
            conflictReason: "duplicate_email",
          }),
        );
      }

      return err(unexpectedError("Failed to create user", error));
    }
  },
});
