/**
 * User routes - HTTP endpoints for user operations.
 */

import { Hono } from "hono";

import type { UserRepository } from "../repositories/user-repository";
import { executeCreateUser, parseCreateUserInput } from "../usecases/create-user";
import { sendHttpError } from "./http-error";

/**
 * Dependencies for user routes.
 */
export interface UserRoutesDeps {
  readonly userRepository: UserRepository;
}

/**
 * Create user routes with injected dependencies.
 * DI allows testing without mock.module().
 */
export const createUserRoutes = (deps: UserRoutesDeps) => {
  const users = new Hono();

  /**
   * POST /users
   * Create a new user.
   */
  users.post("/", async c => {
    const body = await c.req.json();

    // Parse and validate input
    const inputResult = parseCreateUserInput(body);

    if (inputResult.isErr()) {
      return sendHttpError(c, inputResult.error);
    }

    // Execute usecase
    const result = await executeCreateUser({ userRepository: deps.userRepository }, inputResult.value);

    if (result.isErr()) {
      return sendHttpError(c, result.error);
    }

    // Return success response with 201 Created
    return c.json({ data: result.value.user }, 201);
  });

  return users;
};
