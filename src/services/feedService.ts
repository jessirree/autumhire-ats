import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { STORAGE_ENABLED } from '../lib/featureFlags';
import { Job, getPublicJobs } from './jobService';

/** Escape text for XML. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jobItem(job: Job, siteUrl: string): string {
  const link = `${siteUrl}/jobs/${job.id}`;
  const pubDate = job.postedAt?.toDate ? job.postedAt.toDate().toUTCString() : new Date().toUTCString();
  return `    <item>
      <title>${esc(job.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(job.referenceNumber)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${esc(job.department || 'General')}</category>
      <description>${esc(`${job.location} • ${job.jobType}${job.closingDate ? ` • Closes ${job.closingDate}` : ''} — ${(job.description || '').slice(0, 300)}`)}</description>
    </item>`;
}

/**
 * Regenerates the public RSS feed of open vacancies and uploads it to
 * Storage (public/jobs-feed.xml). Called after publishing/closing a job.
 * The returned URL can be pasted into LinkedIn/X automation tools or any
 * RSS reader.
 */
export async function regenerateJobsFeed(siteUrl: string = window.location.origin): Promise<string> {
  if (!STORAGE_ENABLED) {
    throw new Error('The RSS feed needs Firebase Storage, which is not enabled yet.');
  }
  const jobs = await getPublicJobs();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Autumhire — Open Vacancies</title>
    <link>${esc(siteUrl)}/jobs</link>
    <description>Current job openings at Autumhire</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${jobs.map((j) => jobItem(j, siteUrl)).join('\n')}
  </channel>
</rss>`;

  const feedRef = ref(storage, 'public/jobs-feed.xml');
  await uploadString(feedRef, xml, 'raw', { contentType: 'application/rss+xml' });
  return getDownloadURL(feedRef);
}

// ── Social share links ──────────────────────────────────────────────

export function jobPublicUrl(jobId: string, siteUrl: string = window.location.origin): string {
  return `${siteUrl}/jobs/${jobId}`;
}

export function linkedInShareUrl(jobId: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobPublicUrl(jobId))}`;
}

export function twitterShareUrl(job: Job): string {
  const text = `We're hiring: ${job.title} (${job.location}). Apply here:`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(jobPublicUrl(job.id))}`;
}

export function whatsAppShareUrl(job: Job): string {
  const text = `We're hiring: ${job.title} (${job.location}) — ${jobPublicUrl(job.id)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
