import DOMPurify from 'dompurify';

/** Sanitizes rich-text HTML (job descriptions, etc.) before rendering with dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 's', 'ul', 'ol', 'li', 'b', 'i'],
    ALLOWED_ATTR: [],
  });
}

/** Strips all HTML tags, for contexts that need plain text (search, RSS, exports). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
