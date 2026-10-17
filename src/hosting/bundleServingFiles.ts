import type { BundleFile, ValidatedBundle } from './HostingProvider';

/** File-store adapters materialize virtual aliases without changing uploaded file counts or caps.
 * Each alias shares the validated target bytes and MIME; an explicit uploaded path always wins. */
export function bundleServingFiles(bundle: ValidatedBundle): ReadonlyArray<BundleFile> {
  const byPath = new Map(bundle.files.map((file) => [file.path, file]));
  for (const [alias, target] of Object.entries(bundle.aliases ?? {})) {
    const file = byPath.get(target);
    if (file && !byPath.has(alias)) byPath.set(alias, { ...file, path: alias });
  }
  return [...byPath.values()];
}
