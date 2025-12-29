/**
 * Post routes - HTTP endpoints for post operations.
 */

import { Hono } from "hono";

import type { PostRepository } from "../repositories/post-repository";
import type { UserRepository } from "../repositories/user-repository";
import { executeCreatePost, parseCreatePostInput } from "../usecases/create-post";
import { sendHttpError } from "./http-error";

/**
 * Dependencies for post routes.
 */
export interface PostRoutesDeps {
  readonly postRepository: PostRepository;
  readonly userRepository: UserRepository;
}

/**
 * Create post routes with injected dependencies.
 * DI allows testing without mock.module().
 */
export const createPostRoutes = (deps: PostRoutesDeps) => {
  const posts = new Hono();

  /**
   * POST /posts
   * Create a new post.
   */
  posts.post("/", async c => {
    const body = await c.req.json();

    // Parse and validate input
    const inputResult = parseCreatePostInput(body);

    if (inputResult.isErr()) {
      return sendHttpError(c, inputResult.error);
    }

    // Execute usecase
    const result = await executeCreatePost(
      {
        postRepository: deps.postRepository,
        userRepository: deps.userRepository,
      },
      inputResult.value,
    );

    if (result.isErr()) {
      return sendHttpError(c, result.error);
    }

    // Return success response with 201 Created
    return c.json({ data: result.value.post }, 201);
  });

  return posts;
};
