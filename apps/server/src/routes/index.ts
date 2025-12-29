/**
 * Route aggregation - all routes are registered here.
 */

import { Hono } from "hono";

import type { PostRepository } from "../repositories/post-repository";
import type { UserRepository } from "../repositories/user-repository";
import { health } from "./health";
import { createPostRoutes } from "./posts";
import { createUserRoutes } from "./users";

/**
 * Dependencies for all routes.
 * All external dependencies are injected here for testability.
 */
export interface RoutesDeps {
  readonly userRepository: UserRepository;
  readonly postRepository: PostRepository;
}

/**
 * Create all routes with injected dependencies.
 */
export const createRoutes = (deps?: Partial<RoutesDeps>) => {
  const routes = new Hono();

  routes.route("/health", health);

  // Mount user routes if repository is provided
  if (deps?.userRepository) {
    const userRoutes = createUserRoutes({ userRepository: deps.userRepository });
    routes.route("/users", userRoutes);
  }

  // Mount post routes if both repositories are provided
  if (deps?.postRepository && deps?.userRepository) {
    const postRoutes = createPostRoutes({
      postRepository: deps.postRepository,
      userRepository: deps.userRepository,
    });
    routes.route("/posts", postRoutes);
  }

  return routes;
};

export { createPostRoutes, createUserRoutes, health };
