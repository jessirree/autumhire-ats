import { useState } from 'react';
import { Mail, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { sendTestEmail } from '../../services/mailService';

export function SystemSettings() {
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestEmail(to.trim());
      setResult({
        ok: true,
        detail: `Sent. Message ID: ${res.messageId}. SMTP response: ${res.response}`,
      });
    } catch (err: any) {
      // The real SMTP error, or the real reason the call was rejected
      // (wrong role, bad address, MAIL_ENABLED=false) — never a generic
      // "something went wrong".
      setResult({ ok: false, detail: err?.message || 'Failed to send test email.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">System Settings</h1>
        <p className="text-gray-500">Operational checks for the Autumhire ATS.</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Mail className="size-5 text-gray-400" /> Send test email
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Proves the outbound SMTP connection actually works. Use this whenever the mailbox
          password is rotated — it's the difference between finding out now and finding out
          from a candidate.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="destination@example.com"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2"
          >
            <Send className="size-4" /> {sending ? 'Sending…' : 'Send test email'}
          </Button>
        </div>

        {result && (
          <div
            className={`mt-4 p-4 rounded-lg border text-sm flex items-start gap-2 ${
              result.ok
                ? 'bg-autumn-green/10 border-autumn-green/30 text-autumn-green'
                : 'bg-autumn-red/10 border-autumn-red/30 text-autumn-red'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="size-4 mt-0.5 shrink-0" />
            )}
            <span className="break-words">{result.detail}</span>
          </div>
        )}
      </div>
    </div>
  );
}
