import {
  MAX_BATCH_BYTES,
  MAX_BATCH_ITEMS,
  decodeBase64Strict,
  validatePngDimensions,
} from "./png";
import {
  GalleryPainting,
  HttpError,
  PublishItemInput,
  PublishResultPainting,
  ViewerInfo,
} from "./types";

const TEXTURE_DIR = "resource-pack/assets/cdsmp/textures/painting";
const VARIANT_DIR = "data-pack/data/cdsmp/painting_variant";
const RECIPE_DIR = "data-pack/data/cdsmp/recipe/painting_variant";
const PLACEABLE_PATH = "data-pack/data/minecraft/tags/painting_variant/placeable.json";
const SUBMISSION_DIR = ".submission_state";
const DEFAULT_AUTHOR = "College Debt SMP";
const SLUG_PATTERN = /^[a-z0-9_.\-]{1,64}$/;

interface GitTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
}

interface GitTreeResponse {
  sha: string;
  tree: GitTreeEntry[];
  truncated?: boolean;
}

interface SubmissionStateFile {
  variants?: string[];
  pngs?: string[];
  jsons?: string[];
  recipes?: string[];
  submitted_by?: string;
  submitted_name?: string;
  submitted_at?: string;
}

interface PaintingVariantJson {
  asset_id?: string;
  width?: number;
  height?: number;
  title?: string | { text?: string; color?: string };
  author?: string | { text?: string; color?: string };
}

interface PlaceableTagJson {
  replace?: boolean;
  values?: string[];
}

export function sanitizeSlug(raw: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.\-]/g, "")
    .replace(/^[_\.\-]+|[_\.\-]+$/g, "");
  return s || "unnamed";
}

export function assertValidSlug(slug: string): string {
  if (!SLUG_PATTERN.test(slug) || slug === "." || slug === "..") {
    throw new HttpError(400, "Invalid painting slug.");
  }
  return slug;
}

function componentText(val: string | { text?: string } | undefined, fallback: string): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && typeof val.text === "string") return val.text;
  return fallback;
}

export function buildVariantJson(slug: string, width: number, height: number, title: string, author: string) {
  return {
    asset_id: `cdsmp:${slug}`,
    width,
    height,
    title: { text: title, color: "aqua" },
    author: { text: author, color: "gray" },
  };
}

export function buildStonecutterRecipe(slug: string) {
  return {
    type: "minecraft:stonecutting",
    ingredient: "minecraft:painting",
    result: {
      id: "minecraft:painting",
      components: {
        "minecraft:painting/variant": `cdsmp:${slug}`,
      },
      count: 1,
    },
  };
}

function decodeGitBlobUtf8(base64Content: string): string {
  const cleaned = base64Content.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function githubFetch<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = (env.GITHUB_TOKEN || "").trim();
  if (!token) {
    throw new HttpError(503, "Worker GITHUB_TOKEN secret has not been configured yet.");
  }

  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cdsmp-paintings-api/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (!res.ok) {
    const ghMsg =
      json && typeof json === "object" && "message" in json && typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : `GitHub API error (${res.status})`;
    if (res.status === 409 || res.status === 422) {
      throw new HttpError(res.status, ghMsg);
    }
    if (res.status === 404) {
      throw new HttpError(404, ghMsg);
    }
    throw new HttpError(502, `GitHub API error: ${ghMsg}`);
  }

  return json as T;
}

function repoBase(env: Env): { owner: string; repo: string; branch: string; workflow: string } {
  return {
    owner: env.GITHUB_OWNER || "College-Debt",
    repo: env.GITHUB_REPO || "resource-pack",
    branch: env.GITHUB_BRANCH || "main",
    workflow: env.RELEASE_WORKFLOW_FILE || "release.yml",
  };
}

async function getBranchHeadAndTree(env: Env): Promise<{
  headCommitSha: string;
  baseTreeSha: string;
  tree: GitTreeEntry[];
}> {
  const { owner, repo, branch } = repoBase(env);
  const ref = await githubFetch<{ object: { sha: string } }>(
    env,
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const headCommitSha = ref.object.sha;
  const commit = await githubFetch<{ tree: { sha: string } }>(
    env,
    `/repos/${owner}/${repo}/git/commits/${headCommitSha}`,
  );
  const baseTreeSha = commit.tree.sha;
  const treeRes = await githubFetch<GitTreeResponse>(
    env,
    `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`,
  );
  return {
    headCommitSha,
    baseTreeSha,
    tree: Array.isArray(treeRes.tree) ? treeRes.tree : [],
  };
}

async function readBlobJson<T>(env: Env, sha: string): Promise<T | null> {
  const { owner, repo } = repoBase(env);
  const blob = await githubFetch<{ content?: string }>(
    env,
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
  );
  if (!blob.content) return null;
  try {
    return JSON.parse(decodeGitBlobUtf8(blob.content)) as T;
  } catch {
    return null;
  }
}

async function readSubmissionStates(
  env: Env,
  tree: GitTreeEntry[],
): Promise<Array<{ path: string; sha: string; data: SubmissionStateFile }>> {
  const stateEntries = tree.filter(
    (entry) => entry.type === "blob" && entry.path.startsWith(`${SUBMISSION_DIR}/`) && entry.path.endsWith(".json"),
  );
  const loaded = await Promise.all(
    stateEntries.map(async (entry) => {
      const data = await readBlobJson<SubmissionStateFile>(env, entry.sha);
      return data ? { path: entry.path, sha: entry.sha, data } : null;
    }),
  );
  return loaded.filter((x): x is { path: string; sha: string; data: SubmissionStateFile } => x !== null);
}

function mapSubmittersBySlug(
  states: Array<{ path: string; sha: string; data: SubmissionStateFile }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const state of states) {
    const ownerEmail = (state.data.submitted_by || "").trim().toLowerCase();
    if (!ownerEmail) continue;
    for (const variant of state.data.variants || []) {
      const slug = variant.includes(":") ? variant.split(":", 2)[1] : variant;
      if (slug) map.set(slug, ownerEmail);
    }
  }
  return map;
}

export async function dispatchReleaseWorkflow(env: Env): Promise<string> {
  const { owner, repo, branch, workflow } = repoBase(env);
  await githubFetch<void>(
    env,
    `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch }),
    },
  );
  return `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
}

async function commitTreeUpdate(
  env: Env,
  baseTreeSha: string,
  parentCommitSha: string,
  message: string,
  treeUpdates: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha?: string | null;
    content?: string;
  }>,
): Promise<string> {
  const { owner, repo, branch } = repoBase(env);
  const createdTree = await githubFetch<{ sha: string }>(
    env,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeUpdates,
      }),
    },
  );
  const createdCommit = await githubFetch<{ sha: string }>(
    env,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tree: createdTree.sha,
        parents: [parentCommitSha],
      }),
    },
  );
  await githubFetch(
    env,
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sha: createdCommit.sha,
        force: false,
      }),
    },
  );
  return createdCommit.sha;
}

async function withCommitRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < 2 && err instanceof HttpError && (err.status === 409 || err.status === 422)) {
        continue;
      }
      throw err;
    }
  }
  throw new HttpError(409, "Concurrent update conflict; please retry.");
}

export async function listPaintings(
  env: Env,
  viewer: ViewerInfo,
): Promise<{ viewer: ViewerInfo; paintings: GalleryPainting[] }> {
  const { owner, repo, branch } = repoBase(env);
  const { tree } = await getBranchHeadAndTree(env);

  const variantEntries = tree.filter(
    (e) => e.type === "blob" && e.path.startsWith(`${VARIANT_DIR}/`) && e.path.endsWith(".json"),
  );
  const textureShaBySlug = new Map<string, string>();
  for (const e of tree) {
    if (e.type === "blob" && e.path.startsWith(`${TEXTURE_DIR}/`) && e.path.endsWith(".png")) {
      const slug = e.path.slice(TEXTURE_DIR.length + 1, -4);
      textureShaBySlug.set(slug, e.sha);
    }
  }

  const [states, variants] = await Promise.all([
    readSubmissionStates(env, tree),
    Promise.all(
      variantEntries.map(async (entry) => {
        const slug = entry.path.slice(VARIANT_DIR.length + 1, -5);
        const data = await readBlobJson<PaintingVariantJson>(env, entry.sha);
        return { slug, data };
      }),
    ),
  ]);

  const submitters = mapSubmittersBySlug(states);

  const paintings: GalleryPainting[] = variants.map(({ slug, data }) => {
    const title = componentText(data?.title, slug);
    const author = componentText(data?.author, DEFAULT_AUTHOR);
    const width = Number(data?.width) || 1;
    const height = Number(data?.height) || 1;
    const submittedBy = submitters.get(slug) || null;
    const canEdit = viewer.isAdmin || (submittedBy !== null && submittedBy === viewer.email);
    const texSha = textureShaBySlug.get(slug);
    const cacheQuery = texSha ? `?v=${texSha.slice(0, 8)}` : "";
    return {
      slug,
      title,
      author,
      width,
      height,
      textureUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${TEXTURE_DIR}/${encodeURIComponent(slug)}.png${cacheQuery}`,
      submittedBy,
      canEdit,
    };
  });

  paintings.sort((a, b) => a.title.localeCompare(b.title));
  return { viewer, paintings };
}

export async function publishPaintings(
  env: Env,
  rawItems: PublishItemInput[],
  viewer: ViewerInfo,
): Promise<{ paintings: PublishResultPainting[] }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, "Include at least one painting to publish.");
  }
  if (rawItems.length > MAX_BATCH_ITEMS) {
    throw new HttpError(400, `Cannot publish more than ${MAX_BATCH_ITEMS} paintings in one batch.`);
  }

  let totalBytes = 0;
  const validated = rawItems.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new HttpError(400, `Item #${idx + 1} is malformed.`);
    }
    const title = String(item.title || "").trim();
    const author = String(item.author || "").trim() || DEFAULT_AUTHOR;
    if (!title || title.length > 64) {
      throw new HttpError(400, `Painting #${idx + 1} title must be 1–64 characters.`);
    }
    if (author.length > 64) {
      throw new HttpError(400, `Painting #${idx + 1} author must be at most 64 characters.`);
    }
    const width = Number(item.width);
    const height = Number(item.height);
    const scale = Number(item.scale);
    const bytes = decodeBase64Strict(item.pngBase64);
    validatePngDimensions(bytes, width, height, scale);
    totalBytes += bytes.length;
    if (totalBytes > MAX_BATCH_BYTES) {
      throw new HttpError(400, `Total batch size exceeds ${MAX_BATCH_BYTES / (1024 * 1024)} MB limit.`);
    }
    const baseSlug = sanitizeSlug(item.filenameHint || title);
    return {
      title,
      author,
      width,
      height,
      baseSlug,
      pngBase64: String(item.pngBase64).replace(/\s+/g, ""),
    };
  });

  const { owner, repo } = repoBase(env);

  // Create PNG blobs once outside the ref-retry loop
  const pngBlobShas = await Promise.all(
    validated.map(async (item) => {
      const created = await githubFetch<{ sha: string }>(env, `/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.pngBase64, encoding: "base64" }),
      });
      return created.sha;
    }),
  );

  return withCommitRetry(async () => {
    const { headCommitSha, baseTreeSha, tree } = await getBranchHeadAndTree(env);

    const occupiedSlugs = new Set<string>();
    let placeableSha: string | null = null;
    for (const entry of tree) {
      if (entry.type !== "blob") continue;
      if (entry.path.startsWith(`${VARIANT_DIR}/`) && entry.path.endsWith(".json")) {
        occupiedSlugs.add(entry.path.slice(VARIANT_DIR.length + 1, -5));
      } else if (entry.path.startsWith(`${RECIPE_DIR}/`) && entry.path.endsWith(".json")) {
        occupiedSlugs.add(entry.path.slice(RECIPE_DIR.length + 1, -5));
      } else if (entry.path.startsWith(`${TEXTURE_DIR}/`) && entry.path.endsWith(".png")) {
        occupiedSlugs.add(entry.path.slice(TEXTURE_DIR.length + 1, -4));
      } else if (entry.path === PLACEABLE_PATH) {
        placeableSha = entry.sha;
      }
    }

    const placeableTag: PlaceableTagJson =
      (placeableSha ? await readBlobJson<PlaceableTagJson>(env, placeableSha) : null) || {
        replace: false,
        values: [],
      };
    if (!Array.isArray(placeableTag.values)) {
      placeableTag.values = [];
    }

    const stateRecord: SubmissionStateFile = {
      variants: [],
      pngs: [],
      jsons: [],
      recipes: [],
      submitted_by: viewer.email,
      submitted_name: viewer.name || viewer.email,
      submitted_at: new Date().toISOString(),
    };

    const treeUpdates: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha?: string | null;
      content?: string;
    }> = [];
    const results: PublishResultPainting[] = [];

    validated.forEach((item, i) => {
      let finalSlug = item.baseSlug;
      let counter = 1;
      while (occupiedSlugs.has(finalSlug)) {
        finalSlug = `${item.baseSlug}-${counter}`;
        counter++;
      }
      occupiedSlugs.add(finalSlug);

      const pngPath = `${TEXTURE_DIR}/${finalSlug}.png`;
      const variantPath = `${VARIANT_DIR}/${finalSlug}.json`;
      const recipePath = `${RECIPE_DIR}/${finalSlug}.json`;
      const variantRef = `cdsmp:${finalSlug}`;

      treeUpdates.push({
        path: pngPath,
        mode: "100644",
        type: "blob",
        sha: pngBlobShas[i],
      });
      treeUpdates.push({
        path: variantPath,
        mode: "100644",
        type: "blob",
        content: JSON.stringify(buildVariantJson(finalSlug, item.width, item.height, item.title, item.author), null, 2) + "\n",
      });
      treeUpdates.push({
        path: recipePath,
        mode: "100644",
        type: "blob",
        content: JSON.stringify(buildStonecutterRecipe(finalSlug), null, 2) + "\n",
      });

      if (!placeableTag.values!.includes(variantRef)) {
        placeableTag.values!.push(variantRef);
      }

      stateRecord.variants!.push(variantRef);
      stateRecord.pngs!.push(pngPath);
      stateRecord.jsons!.push(variantPath);
      stateRecord.recipes!.push(recipePath);

      results.push({
        slug: finalSlug,
        title: item.title,
        author: item.author,
        width: item.width,
        height: item.height,
      });
    });

    const stateFilename = `web-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.json`;
    treeUpdates.push({
      path: PLACEABLE_PATH,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(placeableTag, null, 2) + "\n",
    });
    treeUpdates.push({
      path: `${SUBMISSION_DIR}/${stateFilename}`,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(stateRecord, null, 2) + "\n",
    });

    const commitMsg =
      results.length === 1
        ? `Add painting "${results[0].title}" via web studio (${viewer.email})`
        : `Add ${results.length} paintings via web studio (${viewer.email})`;

    await commitTreeUpdate(env, baseTreeSha, headCommitSha, commitMsg, treeUpdates);
    return { paintings: results };
  });
}

export async function updatePainting(
  env: Env,
  rawSlug: string,
  titleRaw: unknown,
  authorRaw: unknown,
  viewer: ViewerInfo,
): Promise<{ painting: PublishResultPainting }> {
  const slug = assertValidSlug(rawSlug);
  const title = String(titleRaw ?? "").trim();
  const author = String(authorRaw ?? "").trim() || DEFAULT_AUTHOR;
  if (!title || title.length > 64) {
    throw new HttpError(400, "Title must be 1–64 characters.");
  }
  if (author.length > 64) {
    throw new HttpError(400, "Author must be at most 64 characters.");
  }

  return withCommitRetry(async () => {
    const { headCommitSha, baseTreeSha, tree } = await getBranchHeadAndTree(env);
    const variantPath = `${VARIANT_DIR}/${slug}.json`;
    const variantEntry = tree.find((e) => e.type === "blob" && e.path === variantPath);
    if (!variantEntry) {
      throw new HttpError(404, `Painting "${slug}" was not found.`);
    }

    const states = await readSubmissionStates(env, tree);
    const submitters = mapSubmittersBySlug(states);
    const submittedBy = submitters.get(slug) || null;
    if (!viewer.isAdmin && submittedBy !== viewer.email) {
      throw new HttpError(403, "You do not have permission to edit this painting.");
    }

    const existing = (await readBlobJson<PaintingVariantJson>(env, variantEntry.sha)) || {};
    const width = Number(existing.width) || 1;
    const height = Number(existing.height) || 1;
    const updated = buildVariantJson(slug, width, height, title, author);

    await commitTreeUpdate(env, baseTreeSha, headCommitSha, `Update painting "${slug}" metadata (${viewer.email})`, [
      {
        path: variantPath,
        mode: "100644",
        type: "blob",
        content: JSON.stringify(updated, null, 2) + "\n",
      },
    ]);

    return {
      painting: { slug, title, author, width, height },
    };
  });
}

export async function deletePainting(
  env: Env,
  rawSlug: string,
  viewer: ViewerInfo,
): Promise<{ deleted: string }> {
  const slug = assertValidSlug(rawSlug);

  return withCommitRetry(async () => {
    const { headCommitSha, baseTreeSha, tree } = await getBranchHeadAndTree(env);
    const pngPath = `${TEXTURE_DIR}/${slug}.png`;
    const variantPath = `${VARIANT_DIR}/${slug}.json`;
    const recipePath = `${RECIPE_DIR}/${slug}.json`;
    const variantRef = `cdsmp:${slug}`;

    const treeMap = new Map<string, GitTreeEntry>();
    for (const e of tree) {
      if (e.type === "blob") treeMap.set(e.path, e);
    }

    if (!treeMap.has(variantPath) && !treeMap.has(pngPath)) {
      throw new HttpError(404, `Painting "${slug}" was not found.`);
    }

    const states = await readSubmissionStates(env, tree);
    const submitters = mapSubmittersBySlug(states);
    const submittedBy = submitters.get(slug) || null;
    if (!viewer.isAdmin && submittedBy !== viewer.email) {
      throw new HttpError(403, "You do not have permission to delete this painting.");
    }

    const treeUpdates: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha?: string | null;
      content?: string;
    }> = [];

    for (const p of [pngPath, variantPath, recipePath]) {
      if (treeMap.has(p)) {
        treeUpdates.push({ path: p, mode: "100644", type: "blob", sha: null });
      }
    }

    const placeableEntry = treeMap.get(PLACEABLE_PATH);
    if (placeableEntry) {
      const tag = await readBlobJson<PlaceableTagJson>(env, placeableEntry.sha);
      if (tag && Array.isArray(tag.values) && tag.values.includes(variantRef)) {
        tag.values = tag.values.filter((v) => v !== variantRef);
        treeUpdates.push({
          path: PLACEABLE_PATH,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(tag, null, 2) + "\n",
        });
      }
    }

    for (const st of states) {
      const hadVariant = (st.data.variants || []).includes(variantRef);
      const hadJson = (st.data.jsons || []).includes(variantPath);
      if (!hadVariant && !hadJson) continue;

      const nextVariants = (st.data.variants || []).filter((v) => v !== variantRef);
      const nextPngs = (st.data.pngs || []).filter((p) => p !== pngPath);
      const nextJsons = (st.data.jsons || []).filter((p) => p !== variantPath);
      const nextRecipes = (st.data.recipes || []).filter((p) => p !== recipePath);

      if (nextVariants.length === 0 && nextJsons.length === 0) {
        treeUpdates.push({ path: st.path, mode: "100644", type: "blob", sha: null });
      } else {
        const nextState: SubmissionStateFile = {
          ...st.data,
          variants: nextVariants,
          pngs: nextPngs,
          jsons: nextJsons,
          recipes: nextRecipes,
        };
        treeUpdates.push({
          path: st.path,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(nextState, null, 2) + "\n",
        });
      }
    }

    await commitTreeUpdate(env, baseTreeSha, headCommitSha, `Remove painting "${slug}" (${viewer.email})`, treeUpdates);
    return { deleted: slug };
  });
}
