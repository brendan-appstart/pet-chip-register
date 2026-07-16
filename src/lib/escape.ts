/**
 * HTML-escape untrusted text before interpolating it into a string of HTML
 * (posters, emails). React escapes by default, but our server-generated HTML
 * strings do not, so anything a finder or owner typed must pass through here.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
