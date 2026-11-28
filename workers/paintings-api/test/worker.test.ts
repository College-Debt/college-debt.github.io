import {
  SELF,
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { buildStonecutterRecipe, buildVariantJson, sanitizeSlug } from "../src/github";
import { decodeBase64Strict, validatePngDimensions } from "../src/png";

const TEST_AUD = "test-policy-aud-123";
const TEST_TEAM = "collegedebt.cloudflareaccess.com";

let rsaKeys: CryptoKeyPair;
let publicJwk: JsonWebKey & { kid: string; alg: string; use: string };

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(payloadOverrides: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: "test-key-1" };
  const payload = {
    aud: [TEST_AUD],
    iss: `https://${TEST_TEAM}`,
    exp: now + 600,
    nbf: now - 10,
    email: "player@collegedebt.app",
    name: "Player",
    ...payloadOverrides,
  };
  const headerB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBuf = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    rsaKeys.privateKey,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  return `${headerB64}.${payloadB64}.${toBase64Url(new Uint8Array(sigBuf))}`;
}

function makeFakePng(width: number, height: number): string {
  const buf = new Uint8Array(33);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13, false);
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function makeTestEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  return {
    ...env,
    POLICY_AUD: TEST_AUD,
    ADMIN_EMAILS: "quang@quangmn.com",
    GITHUB_TOKEN: "ghp_test_token",
    ...overrides,
  } as Env;
}

beforeAll(async () => {
  rsaKeys = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const exported = (await crypto.subtle.exportKey("jwk", rsaKeys.publicKey)) as JsonWebKey;
  publicJwk = { ...exported, kid: "test-key-1", alg: "RS256", use: "sig" };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PNG and helper validation", () => {
  it("validates exact PNG IHDR dimensions against block size and scale", () => {
    const b64 = makeFakePng(64, 32);
    const bytes = decodeBase64Strict(b64);
    expect(validatePngDimensions(bytes, 2, 1, 2)).toEqual({ pixelWidth: 64, pixelHeight: 32 });
    expect(() => validatePngDimensions(bytes, 2, 2, 2)).toThrow(/do not match/i);
  });

  it("matches process_paintings.py slug sanitization and JSON format", () => {
    expect(sanitizeSlug("Tort's Pot!")).toBe("torts_pot");
    expect(buildVariantJson("tort-pot", 1, 1, "Tort's Pot", "Quang")).toEqual({
      asset_id: "cdsmp:tort-pot",
      width: 1,
      height: 1,
      title: { text: "Tort's Pot", color: "aqua" },
      author: { text: "Quang", color: "gray" },
    });
    expect(buildStonecutterRecipe("tort-pot")).toEqual({
      type: "minecraft:stonecutting",
      ingredient: "minecraft:painting",
      result: {
        id: "minecraft:painting",
        components: { "minecraft:painting/variant": "cdsmp:tort-pot" },
        count: 1,
      },
    });
  });
});

describe("Paintings Worker HTTP endpoints", () => {
  it("rejects unauthenticated requests with 401 via Workers runtime SELF", async () => {
    const res = await SELF.fetch("https://collegedebt.app/api/paintings");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/authentication required/i);
  });

  it("enforces owner/admin permissions on PATCH", async () => {
    const jwt = await signJwt({ email: "other@collegedebt.app", name: "Other" });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === `https://${TEST_TEAM}/cdn-cgi/access/certs`) {
        return Response.json({ keys: [publicJwk] });
      }
      if (url.endsWith("/git/ref/heads/main")) {
        return Response.json({ object: { sha: "commit-1" } });
      }
      if (url.endsWith("/git/commits/commit-1")) {
        return Response.json({ tree: { sha: "tree-1" } });
      }
      if (url.endsWith("/git/trees/tree-1?recursive=1")) {
        return Response.json({
          sha: "tree-1",
          tree: [
            { path: "data-pack/data/cdsmp/painting_variant/demo.json", mode: "100644", type: "blob", sha: "blob-v" },
            { path: ".submission_state/web-1.json", mode: "100644", type: "blob", sha: "blob-s" },
          ],
        });
      }
      if (url.endsWith("/git/blobs/blob-s")) {
        return Response.json({
          content: btoa(JSON.stringify({ variants: ["cdsmp:demo"], submitted_by: "owner@collegedebt.app" })),
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://collegedebt.app/api/paintings/demo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Cf-Access-Jwt-Assertion": jwt,
        },
        body: JSON.stringify({ title: "Hijacked", author: "Other" }),
      }),
      makeTestEnv(),
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(403);
  });

  it("allows GET /api/paintings for admin viewer and POST /api/paintings atomic commit", async () => {
    const jwt = await signJwt({ email: "quang@quangmn.com", name: "Quang" });
    let capturedTreeBody: { base_tree: string; tree: Array<{ path: string; sha?: string | null; content?: string }> } | null = null;
    let dispatchedWorkflow = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

      if (url === `https://${TEST_TEAM}/cdn-cgi/access/certs`) {
        return Response.json({ keys: [publicJwk] });
      }
      if (url.endsWith("/git/ref/heads/main") && method === "GET") {
        return Response.json({ object: { sha: "commit-1" } });
      }
      if (url.endsWith("/git/commits/commit-1")) {
        return Response.json({ tree: { sha: "tree-1" } });
      }
      if (url.endsWith("/git/trees/tree-1?recursive=1")) {
        return Response.json({
          sha: "tree-1",
          tree: [
            { path: "data-pack/data/cdsmp/painting_variant/tort-pot.json", mode: "100644", type: "blob", sha: "blob-v" },
            { path: "resource-pack/assets/cdsmp/textures/painting/tort-pot.png", mode: "100644", type: "blob", sha: "blob-p1234567" },
            { path: "data-pack/data/minecraft/tags/painting_variant/placeable.json", mode: "100644", type: "blob", sha: "blob-place" },
          ],
        });
      }
      if (url.endsWith("/git/blobs/blob-v")) {
        return Response.json({
          content: btoa(
            JSON.stringify({
              asset_id: "cdsmp:tort-pot",
              width: 1,
              height: 1,
              title: { text: "Tort's Golden Pot", color: "aqua" },
              author: { text: "College Debt SMP", color: "gray" },
            }),
          ),
        });
      }
      if (url.endsWith("/git/blobs/blob-place")) {
        return Response.json({
          content: btoa(JSON.stringify({ replace: false, values: ["cdsmp:tort-pot"] })),
        });
      }
      if (url.endsWith("/git/blobs") && method === "POST") {
        return Response.json({ sha: "new-png-blob" }, { status: 201 });
      }
      if (url.endsWith("/git/trees") && method === "POST") {
        capturedTreeBody = JSON.parse(String(init?.body || "{}"));
        return Response.json({ sha: "tree-2" }, { status: 201 });
      }
      if (url.endsWith("/git/commits") && method === "POST") {
        return Response.json({ sha: "commit-2" }, { status: 201 });
      }
      if (url.endsWith("/git/refs/heads/main") && method === "PATCH") {
        return Response.json({ object: { sha: "commit-2" } });
      }
      if (url.includes("/actions/workflows/release.yml/dispatches") && method === "POST") {
        dispatchedWorkflow = true;
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch ${method} ${url}`);
    });

    const ctxGet = createExecutionContext();
    const resGet = await worker.fetch(
      new Request("https://collegedebt.app/api/paintings", {
        headers: { "Cf-Access-Jwt-Assertion": jwt },
      }),
      makeTestEnv(),
      ctxGet,
    );
    await waitOnExecutionContext(ctxGet);
    expect(resGet.status).toBe(200);
    const getBody = (await resGet.json()) as {
      viewer: { email: string; name: string; isAdmin: boolean };
      paintings: Array<{ slug: string; canEdit: boolean }>;
    };
    expect(getBody.viewer).toEqual({ email: "quang@quangmn.com", name: "Quang", isAdmin: true });
    expect(getBody.paintings[0]).toMatchObject({ slug: "tort-pot", canEdit: true });

    const ctxPost = createExecutionContext();
    const resPost = await worker.fetch(
      new Request("https://collegedebt.app/api/paintings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cf-Access-Jwt-Assertion": jwt,
        },
        body: JSON.stringify({
          items: [
            {
              title: "Tort's Golden Pot",
              author: "Quang",
              width: 1,
              height: 1,
              scale: 2,
              filenameHint: "tort-pot",
              pngBase64: makeFakePng(32, 32),
            },
          ],
        }),
      }),
      makeTestEnv(),
      ctxPost,
    );
    await waitOnExecutionContext(ctxPost);
    expect(resPost.status).toBe(201);
    const postBody = (await resPost.json()) as { paintings: Array<{ slug: string }> };
    expect(postBody.paintings[0].slug).toBe("tort-pot-1"); // collision avoided automatically
    expect(capturedTreeBody).not.toBeNull();
    expect(capturedTreeBody!.tree.map((t) => t.path)).toEqual(
      expect.arrayContaining([
        "resource-pack/assets/cdsmp/textures/painting/tort-pot-1.png",
        "data-pack/data/cdsmp/painting_variant/tort-pot-1.json",
        "data-pack/data/cdsmp/recipe/painting_variant/tort-pot-1.json",
        "data-pack/data/minecraft/tags/painting_variant/placeable.json",
      ]),
    );
    expect(dispatchedWorkflow).toBe(true);
  });

  it("allows creator or admin to DELETE /api/paintings/:slug and cleans up placeable + state", async () => {
    const jwt = await signJwt({ email: "player@collegedebt.app", name: "Player" });
    let capturedDeleteTree: Array<{ path: string; sha?: string | null; content?: string }> = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

      if (url === `https://${TEST_TEAM}/cdn-cgi/access/certs`) {
        return Response.json({ keys: [publicJwk] });
      }
      if (url.endsWith("/git/ref/heads/main") && method === "GET") {
        return Response.json({ object: { sha: "commit-1" } });
      }
      if (url.endsWith("/git/commits/commit-1")) {
        return Response.json({ tree: { sha: "tree-1" } });
      }
      if (url.endsWith("/git/trees/tree-1?recursive=1")) {
        return Response.json({
          sha: "tree-1",
          tree: [
            { path: "resource-pack/assets/cdsmp/textures/painting/my-art.png", mode: "100644", type: "blob", sha: "b1" },
            { path: "data-pack/data/cdsmp/painting_variant/my-art.json", mode: "100644", type: "blob", sha: "b2" },
            { path: "data-pack/data/cdsmp/recipe/painting_variant/my-art.json", mode: "100644", type: "blob", sha: "b3" },
            { path: "data-pack/data/minecraft/tags/painting_variant/placeable.json", mode: "100644", type: "blob", sha: "b4" },
            { path: ".submission_state/web-999.json", mode: "100644", type: "blob", sha: "b5" },
          ],
        });
      }
      if (url.endsWith("/git/blobs/b4")) {
        return Response.json({ content: btoa(JSON.stringify({ replace: false, values: ["cdsmp:my-art"] })) });
      }
      if (url.endsWith("/git/blobs/b5")) {
        return Response.json({
          content: btoa(
            JSON.stringify({
              variants: ["cdsmp:my-art"],
              pngs: ["resource-pack/assets/cdsmp/textures/painting/my-art.png"],
              jsons: ["data-pack/data/cdsmp/painting_variant/my-art.json"],
              recipes: ["data-pack/data/cdsmp/recipe/painting_variant/my-art.json"],
              submitted_by: "player@collegedebt.app",
            }),
          ),
        });
      }
      if (url.endsWith("/git/trees") && method === "POST") {
        capturedDeleteTree = (JSON.parse(String(init?.body || "{}")) as { tree: typeof capturedDeleteTree }).tree;
        return Response.json({ sha: "tree-2" }, { status: 201 });
      }
      if (url.endsWith("/git/commits") && method === "POST") {
        return Response.json({ sha: "commit-2" }, { status: 201 });
      }
      if (url.endsWith("/git/refs/heads/main") && method === "PATCH") {
        return Response.json({ object: { sha: "commit-2" } });
      }
      if (url.includes("/actions/workflows/release.yml/dispatches") && method === "POST") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch ${method} ${url}`);
    });

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://collegedebt.app/api/paintings/my-art", {
        method: "DELETE",
        headers: { "Cf-Access-Jwt-Assertion": jwt },
      }),
      makeTestEnv(),
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: "my-art" });
    expect(capturedDeleteTree).toEqual(
      expect.arrayContaining([
        { path: "resource-pack/assets/cdsmp/textures/painting/my-art.png", mode: "100644", type: "blob", sha: null },
        { path: "data-pack/data/cdsmp/painting_variant/my-art.json", mode: "100644", type: "blob", sha: null },
        { path: "data-pack/data/cdsmp/recipe/painting_variant/my-art.json", mode: "100644", type: "blob", sha: null },
        { path: ".submission_state/web-999.json", mode: "100644", type: "blob", sha: null },
      ]),
    );
  });

  it("handles GET /api/session and GET /api/login cleanly without synthesizing lowercase email prefix names", async () => {
    const adminJwtNoName = await signJwt({ email: "quang@quangmn.com", name: undefined });
    const memberJwt = await signJwt({ email: "member@collegedebt.app", name: "Member" });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === `https://${TEST_TEAM}/cdn-cgi/access/certs`) {
        return Response.json({ keys: [publicJwk] });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const ctx1 = createExecutionContext();
    const resAdmin = await worker.fetch(
      new Request("https://collegedebt.app/api/session", {
        headers: { "Cf-Access-Jwt-Assertion": adminJwtNoName },
      }),
      makeTestEnv(),
      ctx1,
    );
    await waitOnExecutionContext(ctx1);
    expect(resAdmin.status).toBe(200);
    expect(await resAdmin.json()).toEqual({
      authenticated: true,
      viewer: { email: "quang@quangmn.com", name: "", isAdmin: true },
    });

    const ctx2 = createExecutionContext();
    const resMember = await worker.fetch(
      new Request("https://collegedebt.app/api/paintings/session", {
        headers: { "Cf-Access-Jwt-Assertion": memberJwt },
      }),
      makeTestEnv(),
      ctx2,
    );
    await waitOnExecutionContext(ctx2);
    expect(resMember.status).toBe(200);
    expect(await resMember.json()).toEqual({
      authenticated: true,
      viewer: { email: "member@collegedebt.app", name: "Member", isAdmin: false },
    });

    const ctx3 = createExecutionContext();
    const resLoginSafe = await worker.fetch(
      new Request("https://collegedebt.app/api/login?next=%2Fwiki%2Fcollege-debt-smp%2F%3Fx%3D1", {
        headers: { "Cf-Access-Jwt-Assertion": memberJwt },
      }),
      makeTestEnv(),
      ctx3,
    );
    await waitOnExecutionContext(ctx3);
    expect(resLoginSafe.status).toBe(302);
    expect(resLoginSafe.headers.get("Location")).toBe("https://collegedebt.app/wiki/college-debt-smp/?x=1");

    const ctx4 = createExecutionContext();
    const resLoginEvil = await worker.fetch(
      new Request("https://collegedebt.app/api/login?next=%2F%2Fevil.example%2Fphish", {
        headers: { "Cf-Access-Jwt-Assertion": memberJwt },
      }),
      makeTestEnv(),
      ctx4,
    );
    await waitOnExecutionContext(ctx4);
    expect(resLoginEvil.status).toBe(302);
    expect(resLoginEvil.headers.get("Location")).toBe("https://collegedebt.app/");
  });
});
