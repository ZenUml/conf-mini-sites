#!/usr/bin/env node
// Create a Confluence test page carrying the Conf Mini-Sites Forge macro (key `mini-site`) via the REST API —
// no browser, no editor, no slash menu. One Bash invocation, prints the page URL (and the derived instanceId).
//
// This is the API-only analogue of what tests/e2e/helpers/confluence.ts does in the suite: it POSTs an
// atlas_doc_format page whose body contains a single Forge `extension` ADF node for the mini-site macro. The
// macro's `localId` is what the resolver hashes into the per-instance id, so we generate it here and report the
// instanceId we expect the resolver to compute (instanceId = "i" + sha256(`${cloudId}:${localId}`).hex[0..31]).
//
// Optionally (--bundle <dir>) it pre-publishes a multi-file bundle to THAT instanceId via the control Worker —
// the same shared-secret call the resolver's `publish` makes — so the page renders a live mini-site the instant
// it loads, with no manual upload through the Publisher modal.
//
// Usage:
//   set -a; source .env.forge.local; set +a            # FORGE_EMAIL + FORGE_API_TOKEN
//   node .claude/skills/create-test-page/scripts/create-test-page.mjs \
//     --site lite-dev --space SD \
//     --title "mini-site render test" \
//     --bundle .claude/skills/create-test-page/fixtures/sample-bundle
//
// Output (two lines): the page URL, then `instanceId=<id>`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join, relative, sep } from "node:path";
import { parseArgs } from "node:util";

// site → Confluence host + the Forge app/env identity baked into the macro's extensionKey. ONE app (single
// variant), so there is no lite/full/diagramly fan-out — just per-Confluence-site env rows. Look up a new site's
// env id with `forge environments list` (or read it off a live macro iframe URL) and add a row.
const SITES = {
  // Default dev target. cloudId is the lite-dev tenant; the resolver hashes it with localId into the instanceId,
  // so it MUST match the site, otherwise a pre-published bundle lands on a different instance than the page resolves.
  "lite-dev": {
    host: "lite-dev.atlassian.net",
    cloudId: "bc8bb5b3-09d2-4932-b68c-9b56fab8e34a",
    appId: "2efdb7d9-ee5a-4294-b56a-b514e36e1a98",
    envId: "f69f8404-376e-4a05-9d34-c8d53785db66",
  },
};

const MACRO_KEY = "mini-site"; // the CMS macro module key (manifest.yml `modules.macro[].key`) — NOT a ZenUML macro

const { values: args } = parseArgs({
  options: {
    site:   { type: "string", default: "lite-dev" },
    space:  { type: "string" },
    title:  { type: "string" },
    parent: { type: "string" },
    bundle: { type: "string" }, // optional dir of a multi-file bundle to pre-publish to the page's instance
  },
});

const site = SITES[args.site];
if (!site) fail(`Unknown --site '${args.site}'. Choices: ${Object.keys(SITES).join(", ")}`);
if (!args.space) fail("Missing --space (e.g. SD)");

const email = process.env.FORGE_EMAIL || process.env.ATLASSIAN_EMAIL;
const token = process.env.FORGE_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;
if (!email || !token) fail("Missing FORGE_EMAIL / FORGE_API_TOKEN. Create a token at https://id.atlassian.com/manage-profile/security/api-tokens and `source .env.forge.local`.");

const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
const base = `https://${site.host}/wiki`;
const title = args.title || `mini-site test ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

// The macro localId is the seed the resolver hashes into the per-instance id. Generate it here so we can both
// embed it in the ADF and pre-publish to the matching instance.
const localId = randomUUID();
const instanceId = deriveInstanceId(localId, site.cloudId);

// 1. Pre-publish a bundle to the instance, if requested — exactly the call the resolver's `publish` makes
//    (control Worker, shared secret). Do it BEFORE creating the page so the page renders live on first load.
if (args.bundle) {
  const secret = process.env.CONTROL_SHARED_SECRET;
  if (!secret) fail("--bundle requires CONTROL_SHARED_SECRET (the resolver↔control shared secret) in the env.");
  const controlBase = (process.env.CONTROL_URL || "https://conf-mini-sites-remote-dev.zenuml.workers.dev").replace(/\/+$/, "");
  const files = readBundle(args.bundle);
  const res = await fetch(`${controlBase}/publish?instanceId=${encodeURIComponent(instanceId)}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-mini-sites-secret": secret },
    body: JSON.stringify({ files }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    fail(`publish to ${instanceId} failed: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
}

// 2. Create the page carrying the mini-site macro (atlas_doc_format ADF — v2 pages API).
const extensionKey = `${site.appId}/${site.envId}/static/${MACRO_KEY}`;
const adf = {
  type: "doc",
  version: 1,
  content: [
    { type: "paragraph", content: [{ type: "text", text: title }] },
    {
      type: "extension",
      attrs: {
        extensionType: "com.atlassian.ecosystem",
        extensionKey,
        parameters: {
          localId,
          extensionId: `ari:cloud:ecosystem::extension/${extensionKey}`,
          extensionTitle: "Mini-Site",
          guestParams: {},
        },
        layout: "default",
        localId,
      },
    },
  ],
};

const spaceId = await resolveSpaceId(args.space);
const pageReq = {
  spaceId,
  status: "current",
  title,
  body: { representation: "atlas_doc_format", value: JSON.stringify(adf) },
};
if (args.parent) pageReq.parentId = args.parent;

const page = await api("POST", "/api/v2/pages", pageReq);

console.log(`${base}/spaces/${args.space}/pages/${page.id}`);
console.log(`instanceId=${instanceId}`);

// ---

/** instanceId the resolver derives: "i" + sha256(`${cloudId}:${localId}`).hex.slice(0,31). Kept byte-identical
 *  to forge-app/src/index.js instanceIdFromContext + tests/e2e/helpers/confluence.ts deriveInstanceId. */
function deriveInstanceId(localId, cloudId) {
  const hex = createHash("sha256").update(`${cloudId}:${localId}`).digest("hex");
  return "i" + hex.slice(0, 31);
}

/** Read a bundle dir into the control Worker's PublishFile[] shape: { path (POSIX, relative), b64 }. Recurses so
 *  nested mini-sites (data/, assets/) keep their relative paths — the same shape the Publisher uploads. */
function readBundle(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push({ path: relative(dir, full).split(sep).join("/"), b64: readFileSync(full).toString("base64") });
    }
  };
  walk(dir);
  if (!out.some((f) => f.path === "index.html")) fail(`bundle '${dir}' has no index.html — it would be rejected as MISSING_INDEX_HTML.`);
  if (out.length < 2) fail(`bundle '${dir}' is single-file — the control Worker rejects it as BUNDLE_NOT_MULTIFILE.`);
  return out;
}

/** Resolve a space key → numeric spaceId (the v2 pages API wants the id, not the key). */
async function resolveSpaceId(key) {
  if (process.env.E2E_SPACE_ID && key === (process.env.E2E_SPACE_KEY || "SD")) return process.env.E2E_SPACE_ID;
  const data = await api("GET", `/api/v2/spaces?keys=${encodeURIComponent(key)}`);
  const id = data?.results?.[0]?.id;
  if (!id) fail(`Could not resolve spaceId for space key '${key}'.`);
  return id;
}

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) fail(`HTTP ${res.status} on ${method} ${path}\n${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
