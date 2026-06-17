// Confluence REST helpers for e2e — create/delete a page carrying the Mini-Site Forge macro (atlas_doc_format
// ADF extension) and derive the per-instance id the resolver will compute from the macro's localId. Lets specs
// stand up a real macro on a real page in one HTTPS call (no editor automation).
import { createHash, randomUUID } from 'node:crypto';
import { E2E } from './env';

function auth(): string {
  return 'Basic ' + Buffer.from(`${E2E.forgeEmail}:${E2E.forgeApiToken}`).toString('base64');
}

/** The resolver computes instanceId = "i" + sha256(`${cloudId}:${localId}`).hex.slice(0,31). */
export function deriveInstanceId(localId: string, cloudId = E2E.cloudId): string {
  const hex = createHash('sha256').update(`${cloudId}:${localId}`).digest('hex');
  return 'i' + hex.slice(0, 31);
}

export interface MacroPage { pageId: string; url: string; localId: string; instanceId: string }

/** Create a Confluence page in the configured space with one Mini-Site Forge macro. Returns ids + the derived
 *  instanceId so a spec can pre-publish to it or assert the resolver resolves the same instance. */
export async function createMacroPage(opts: { title?: string; localId?: string } = {}): Promise<MacroPage> {
  const localId = opts.localId || randomUUID();
  const extensionId = `ari:cloud:ecosystem::extension/${E2E.appId}/${E2E.envId}/static/${E2E.macroKey}`;
  const extensionKey = `${E2E.appId}/${E2E.envId}/static/${E2E.macroKey}`;
  const adf = {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Conf Mini-Sites e2e.' }] },
      { type: 'extension', attrs: { extensionType: 'com.atlassian.ecosystem', extensionKey, parameters: { localId, extensionId, extensionTitle: 'Mini-Site', guestParams: {} }, layout: 'default', localId } },
    ],
  };
  const title = opts.title || `e2e mini-site ${new Date().toISOString()}`;
  const res = await fetch(`${E2E.baseUrl()}/wiki/api/v2/pages`, {
    method: 'POST',
    headers: { authorization: auth(), 'content-type': 'application/json' },
    body: JSON.stringify({ spaceId: E2E.spaceId, status: 'current', title, body: { representation: 'atlas_doc_format', value: JSON.stringify(adf) } }),
  });
  if (!res.ok) throw new Error(`createMacroPage failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return { pageId: data.id, url: `${E2E.baseUrl()}/wiki/spaces/${E2E.spaceKey}/pages/${data.id}`, localId, instanceId: deriveInstanceId(localId) };
}

export async function deletePage(pageId: string): Promise<void> {
  await fetch(`${E2E.baseUrl()}/wiki/api/v2/pages/${pageId}`, { method: 'DELETE', headers: { authorization: auth() } }).catch(() => {});
}

export async function currentUser(): Promise<{ accountId: string; email: string }> {
  const res = await fetch(`${E2E.baseUrl()}/wiki/rest/api/user/current`, { headers: { authorization: auth() } });
  const j = await res.json();
  return { accountId: j.accountId, email: j.email };
}
