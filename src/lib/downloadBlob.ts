/**
 * Triggers a browser download for a Blob via a temporary anchor element.
 *
 * `click()` only STARTS the download — it is asynchronous. Revoking the
 * object URL synchronously right after can invalidate it before the browser
 * has read the blob, which presents as a button that silently does nothing
 * on large files. The anchor is appended to the DOM before clicking (some
 * browsers require this for a reliable click()) and removed after; the
 * revoke is deferred so the download has time to start.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
