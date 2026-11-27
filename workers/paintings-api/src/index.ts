import { authenticateRequest } from "./auth";
import {
  deletePainting,
  dispatchReleaseWorkflow,
  listPaintings,
  publishPaintings,
  updatePainting,
} from "./github";
import { HttpError, PublishItemInput } from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/";
  }
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return "/";
  }
  try {
    const resolved = new URL(trimmed, "https://collegedebt.app");
    if (resolved.origin !== "https://collegedebt.app") return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}

async function readJsonBody<T>(request: Request): Promise<T> {
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Expected application/json request body.");
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Malformed JSON request body.");
  }
}

function triggerReleaseInBackground(env: Env, ctx: ExecutionContext, action: string): void {
  ctx.waitUntil(
    dispatchReleaseWorkflow(env).catch((err) => {
      console.error(
        JSON.stringify({
          message: "release workflow dispatch failed",
          action,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }),
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    try {
      console.log(
        JSON.stringify({
          message: "paintings api request",
          method: request.method,
          path: pathname,
        }),
      );

      if (pathname === "/api/paintings/session" && request.method === "GET") {
        const viewer = await authenticateRequest(request, env);
        return jsonResponse({ authenticated: true, viewer }, 200);
      }

      if (pathname === "/api/paintings/login" && request.method === "GET") {
        await authenticateRequest(request, env);
        const safeNext = sanitizeNextPath(url.searchParams.get("next"));
        const target = new URL(safeNext, url.origin).toString();
        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            "Cache-Control": "no-store",
          },
        });
      }

      if (pathname === "/api/paintings" && request.method === "GET") {
        const viewer = await authenticateRequest(request, env);
        const data = await listPaintings(env, viewer);
        return jsonResponse(data, 200);
      }

      if (pathname === "/api/paintings" && request.method === "POST") {
        const viewer = await authenticateRequest(request, env);
        const body = await readJsonBody<{ items?: PublishItemInput[] }>(request);
        const result = await publishPaintings(env, body.items || [], viewer);
        triggerReleaseInBackground(env, ctx, "publish");
        return jsonResponse(
          {
            paintings: result.paintings,
            workflowUrl: `https://github.com/${env.GITHUB_OWNER || "College-Debt"}/${env.GITHUB_REPO || "resource-pack"}/actions/workflows/${env.RELEASE_WORKFLOW_FILE || "release.yml"}`,
          },
          201,
        );
      }

      const itemMatch = pathname.match(/^\/api\/paintings\/([^/]+)$/);
      if (itemMatch) {
        let slug: string;
        try {
          slug = decodeURIComponent(itemMatch[1]);
        } catch {
          throw new HttpError(400, "Malformed painting slug.");
        }

        if (request.method === "PATCH") {
          const viewer = await authenticateRequest(request, env);
          const body = await readJsonBody<{ title?: unknown; author?: unknown }>(request);
          const result = await updatePainting(env, slug, body.title, body.author, viewer);
          triggerReleaseInBackground(env, ctx, "patch");
          return jsonResponse(result, 200);
        }

        if (request.method === "DELETE") {
          const viewer = await authenticateRequest(request, env);
          const result = await deletePainting(env, slug, viewer);
          triggerReleaseInBackground(env, ctx, "delete");
          return jsonResponse(result, 200);
        }
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        JSON.stringify({
          message: "unhandled worker error",
          method: request.method,
          path: pathname,
          error: message,
        }),
      );
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
