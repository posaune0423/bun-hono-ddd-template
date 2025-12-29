/**
 * Create User usecase.
 * Orchestrates repository calls and domain logic.
 */

import { type Result, err, ok } from "neverthrow";

import { conflictError } from "../../domain/shared/errors";
import type { ConflictError, NotFoundError, UnexpectedError } from "../../domain/shared/errors";
import type { User, UserRepository } from "../../repositories/user-repository";
import type { CreateUserInput } from "./input";

/**
 * Output of the create-user usecase.
 */
export interface CreateUserOutput {
  readonly user: User;
}

/**
 * Dependencies required by the usecase.
 * Injected for testability (no hard dependencies on infra).
 */
export interface CreateUserDeps {
  readonly userRepository: UserRepository;
}

/**
 * Usecase error - combines domain errors with repository errors.
 */
export type CreateUserError = ConflictError | NotFoundError | UnexpectedError;

/**
 * Execute the create-user usecase.
 *
 * @param deps - Injected dependencies (repositories, etc.)
 * @param input - Validated input data
 * @returns Result with output or error
 */
export const executeCreateUser = async (
  deps: CreateUserDeps,
  input: CreateUserInput,
): Promise<Result<CreateUserOutput, CreateUserError>> => {
  const { userRepository } = deps;

  // Check if email already exists
  const existingResult = await userRepository.findByEmail(input.email);

  if (existingResult.isErr()) {
    return err(existingResult.error);
  }

  if (existingResult.value) {
    return err(
      conflictError(`User with email '${input.email}' already exists`, {
        resource: "User",
        conflictReason: "duplicate_email",
      }),
    );
  }

  // Create the user
  const createResult = await userRepository.create({
    name: input.name,
    email: input.email,
    image: input.image,
  });

  if (createResult.isErr()) {
    return err(createResult.error);
  }

  return ok({ user: createResult.value });
};
