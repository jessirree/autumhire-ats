"use client";

/**
 * Promise-based confirm / prompt modals — accessible replacements for the
 * blocking browser `confirm()` and `prompt()` primitives.
 *
 * Usage (from anywhere, no hook/context required):
 *
 *   import { confirm, promptText } from '@/components/ui/confirm-dialog';
 *
 *   if (!(await confirm({ title: 'Delete this?', variant: 'destructive' }))) return;
 *   const note = await promptText({ title: 'Add a note', multiline: true });
 *   if (note === null) return; // cancelled
 *
 * A single <DialogHost /> must be mounted once near the app root. Requests are
 * queued, so overlapping calls resolve in order. Radix provides the focus trap,
 * ESC-to-cancel, and keyboard navigation.
 */

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button, buttonVariants } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "../../lib/utils";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export interface PromptOptions {
  title?: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
  /** When true, the confirm button is disabled until non-whitespace is entered. */
  required?: boolean;
}

type ConfirmRequest = {
  id: number;
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type PromptRequest = {
  id: number;
  kind: "prompt";
  options: PromptOptions;
  resolve: (value: string | null) => void;
};

type DialogRequest = ConfirmRequest | PromptRequest;

// ── Tiny external store (so the API works outside React render) ──────
let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DialogRequest | null {
  return queue[0] ?? null;
}

function enqueue(request: DialogRequest) {
  queue = [...queue, request];
  emit();
}

function resolveCurrent() {
  queue = queue.slice(1);
  emit();
}

/** Accessible replacement for window.confirm — resolves true/false. */
export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    enqueue({ id: nextId++, kind: "confirm", options, resolve });
  });
}

/**
 * Accessible replacement for window.prompt — resolves the entered string,
 * or null when cancelled/dismissed.
 */
export function promptText(options: PromptOptions = {}): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    enqueue({ id: nextId++, kind: "prompt", options, resolve });
  });
}

// ── Host component (mount once at the app root) ─────────────────────
export function DialogHost() {
  const current = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!current) return null;
  // `key` remounts inner state (open flag, text value) per request.
  return current.kind === "confirm" ? (
    <ConfirmView key={current.id} request={current} />
  ) : (
    <PromptView key={current.id} request={current} />
  );
}

function ConfirmView({ request }: { request: ConfirmRequest }) {
  const [open, setOpen] = React.useState(true);
  const { options, resolve } = request;

  // Resolve once, on close, so the exit animation can play.
  const settle = (value: boolean) => {
    resolve(value);
    setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Dismissed via ESC / overlay — treat as cancel if not already settled.
          resolve(false);
          setOpen(false);
        }
      }}
    >
      <AlertDialogContent onCloseAutoFocus={() => resolveCurrent()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title ?? "Are you sure?"}</AlertDialogTitle>
          {options.description ? (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {options.cancelText ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              options.variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
            )}
            onClick={() => settle(true)}
          >
            {options.confirmText ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PromptView({ request }: { request: PromptRequest }) {
  const { options, resolve } = request;
  const [open, setOpen] = React.useState(true);
  const [value, setValue] = React.useState(options.defaultValue ?? "");

  const settle = (result: string | null) => {
    resolve(result);
    setOpen(false);
  };

  const canSubmit = !options.required || value.trim().length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    settle(value);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resolve(null);
          setOpen(false);
        }
      }}
    >
      <DialogContent onCloseAutoFocus={() => resolveCurrent()}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{options.title ?? "Enter a value"}</DialogTitle>
            {options.description ? (
              <DialogDescription>{options.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="py-4">
            {options.multiline ? (
              <Textarea
                autoFocus
                rows={4}
                placeholder={options.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  // Ctrl/Cmd+Enter submits a multi-line prompt.
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
                }}
              />
            ) : (
              <Input
                autoFocus
                placeholder={options.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => settle(null)}>
              {options.cancelText ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {options.confirmText ?? "OK"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
