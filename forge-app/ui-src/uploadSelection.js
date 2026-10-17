// Preserve filenames in both pickers. The backend creates index.html aliases authoritatively.
export function selectUploadFiles(fileList, mode = 'folder') {
  const files = [...fileList];
  if (mode === 'html') {
    if (files.length !== 1 || !/\.(html|htm)$/i.test(files[0].name)) {
      return { ok: false, reason: 'invalid_html_file', message: 'Choose one HTML file (.html or .htm).' };
    }
    return { ok: true, files: [{ file: files[0], path: files[0].name, size: files[0].size }] };
  }
  const entries = files.map((file) => {
    const relative = file.webkitRelativePath || file.name;
    const slash = relative.indexOf('/');
    return { file, path: slash >= 0 ? relative.slice(slash + 1) : relative, size: file.size };
  });
  const rootHtml = entries.filter((file) => !file.path.includes('/') && /\.(html|htm)$/i.test(file.path));
  if (!entries.some((file) => file.path === 'index.html') && rootHtml.length !== 1) {
    return { ok: false, reason: 'missing_index_html', message: 'Include a root index.html or exactly one root HTML file (.html or .htm).' };
  }
  return { ok: true, files: entries };
}
