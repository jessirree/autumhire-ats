import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { downloadJobCvs } from '../../lib/downloadJobCvs';
import { Application } from '../../services/applicationService';
import { logAudit } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';

interface DownloadCvsButtonProps {
  job: { id: string; referenceNumber: string; title: string };
  applications: Application[];
  size?: 'sm' | 'default';
  label?: string;
  className?: string;
  /** When set, the button is disabled and this explains why via a tooltip. */
  disabledReason?: string;
}

/** "Download all CVs" button + progress dialog + skipped-candidates report. */
export function DownloadCvsButton({
  job,
  applications,
  size = 'sm',
  label = 'Download all CVs',
  className,
  disabledReason,
}: DownloadCvsButtonProps) {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[] | null>(null);

  const handleClick = async () => {
    if (!user || disabledReason || running) return;
    setRunning(true);
    setProgress({ done: 0, total: applications.length });
    try {
      const result = await downloadJobCvs(job, applications, (done, total) => setProgress({ done, total }));
      await logAudit(
        user,
        'update',
        'Job',
        job.id,
        `Downloaded ${result.zipped} CV(s) as a zip for "${job.title}" (${result.skipped.length} skipped)`
      );
      toast.success(
        `${result.zipped} CV${result.zipped === 1 ? '' : 's'} zipped${result.skipped.length ? `, ${result.skipped.length} skipped` : ''}.`
      );
      if (result.skipped.length > 0) setSkipped(result.skipped);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download CVs.');
    } finally {
      setRunning(false);
    }
  };

  const button = (
    <Button
      variant="outline"
      size={size}
      className={`gap-2 ${className ?? ''}`}
      disabled={running || !!disabledReason}
      onClick={handleClick}
    >
      {running ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {label}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{button}</span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      <Dialog open={running} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Zipping CVs…</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            <p className="text-sm text-muted-foreground text-center">
              {progress.done} of {progress.total}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!skipped} onOpenChange={(open) => !open && setSkipped(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {skipped?.length} candidate{skipped?.length === 1 ? '' : 's'} skipped
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {skipped?.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm bg-muted border border-border rounded-lg px-3 py-2"
              >
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted-foreground">{s.reason}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipped(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
