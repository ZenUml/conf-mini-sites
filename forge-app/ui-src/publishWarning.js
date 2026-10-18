// Display only a fixed explanation, never matched bytes or server-supplied HTML.
export function renderPublishWarning(warnings, notice, row) {
  const hasWarnings = Array.isArray(warnings) && warnings.length > 0;
  notice.hidden = !hasWarnings;
  notice.textContent = hasWarnings ? 'Published with a warning: some text looks like a random token. Review your source files for credentials. This heuristic can also flag ordinary content.' : '';
  if (hasWarnings && row) {
    row.querySelectorAll('span').forEach((span) => {
      if (span.textContent === 'Scan passed') span.textContent = 'Review warning';
    });
  }
}
