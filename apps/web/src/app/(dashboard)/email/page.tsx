'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Copy,
  Inbox,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Shuffle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { toast } from '@/hooks/use-toast';
import {
  useEmailDomains,
  useCreateEmailAccount,
  useEmailInbox,
  useEmailMessage,
  type EmailMessage,
} from '@/lib/queries';

/* ── helpers ──────────────────────────────────────────────────────────────── */

function copyToClipboard(text: string, label = 'Copied!') {
  navigator.clipboard.writeText(text);
  toast({ title: label, description: text });
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function randomUsername(): string {
  const words = ['swift', 'nova', 'pixel', 'frost', 'storm', 'echo', 'flux', 'apex', 'bolt', 'drift'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}${num}`;
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/* ── Message detail panel ─────────────────────────────────────────────────── */

function MessageDetail({
  messageId,
  token,
  onBack,
}: {
  messageId: string;
  token: string;
  onBack: () => void;
}) {
  const { data: msg, isLoading } = useEmailMessage(messageId, token);
  const [showHtml, setShowHtml] = useState(true);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Separator />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!msg) return null;

  const hasHtml = msg.html?.length > 0 && msg.html[0]?.trim();

  return (
    <div className="space-y-4">
      {/* back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </button>

      {/* header */}
      <div className="space-y-1">
        <h3 className="text-base font-bold leading-snug">{msg.subject || '(no subject)'}</h3>
        <p className="text-xs text-muted-foreground">
          From <span className="font-medium text-foreground">{msg.from?.name || msg.from?.address}</span>
          {msg.from?.name && <span className="text-muted-foreground/60"> &lt;{msg.from.address}&gt;</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(msg.createdAt)}
        </p>
      </div>

      <Separator />

      {/* toggle html/text */}
      {hasHtml && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowHtml((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHtml ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showHtml ? 'Plain text' : 'HTML view'}
          </button>
        </div>
      )}

      {/* body */}
      {hasHtml && showHtml ? (
        <div className="rounded-xl border border-border/50 bg-white dark:bg-card overflow-hidden">
          <iframe
            srcDoc={msg.html[0]}
            title="Email content"
            className="w-full min-h-[320px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      ) : (
        <pre className="whitespace-pre-wrap break-words rounded-xl border border-border/50 bg-muted/40 p-4 text-sm font-mono leading-relaxed">
          {msg.text || '(empty message)'}
        </pre>
      )}
    </div>
  );
}

/* ── Inbox panel ──────────────────────────────────────────────────────────── */

function InboxPanel({
  address,
  token,
}: {
  address: string;
  token: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: messages = [], isLoading, dataUpdatedAt, refetch, isFetching } = useEmailInbox(address, token);

  if (selectedId) {
    return (
      <MessageDetail
        messageId={selectedId}
        token={token}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* inbox header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold truncate">{address}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live inbox · auto-refreshes every 15s
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => copyToClipboard(address, 'Address copied!')}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* warning */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p className="text-xs text-muted-foreground">
          Temporary inbox expires after 10 minutes of inactivity. Save important content before closing.
        </p>
      </div>

      {/* messages */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-10 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground/60">Send an email to this address and it'll appear here</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {messages.map((msg) => (
            <button
              key={msg.id}
              type="button"
              onClick={() => setSelectedId(msg.id)}
              className="w-full rounded-xl border border-border/50 bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm card-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!msg.seen && (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <p className="truncate text-sm font-semibold">
                      {msg.subject || '(no subject)'}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {msg.from?.name || msg.from?.address} · {msg.intro}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{timeAgo(msg.createdAt)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {dataUpdatedAt > 0 && (
        <p className="text-center text-xs text-muted-foreground/50">
          Updated {timeAgo(new Date(dataUpdatedAt).toISOString())}
        </p>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export default function EmailPage() {
  const domainsQuery = useEmailDomains();
  const createAccount = useCreateEmailAccount();

  const [username, setUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [account, setAccount] = useState<{ address: string; token: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword] = useState(randomPassword);

  // Pre-fill random username and auto-select first domain
  useEffect(() => {
    setUsername(randomUsername());
  }, []);

  useEffect(() => {
    if (domainsQuery.data?.length && !selectedDomain) {
      setSelectedDomain(domainsQuery.data[0].domain);
    }
  }, [domainsQuery.data, selectedDomain]);

  const address = username && selectedDomain ? `${username}@${selectedDomain}` : '';

  const handleCreate = useCallback(async () => {
    if (!address) return;
    const result = await createAccount.mutateAsync({ address, password: generatedPassword });
    setAccount({ address: result.address, token: result.token });
  }, [address, generatedPassword, createAccount]);

  const handleShuffle = () => setUsername(randomUsername());

  const handleReset = () => {
    setAccount(null);
    setUsername(randomUsername());
    createAccount.reset();
  };

  /* ── Active inbox view ── */
  if (account) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Temporary Email"
          description="Your disposable inbox is live."
          actions={
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <Mail className="h-4 w-4" />
              New address
            </Button>
          }
        />
        <Card>
          <CardContent className="p-6">
            <InboxPanel address={account.address} token={account.token} />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Create view ── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Temporary Email"
        description="Generate a disposable inbox instantly no sign-up, no tracking."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3 w-3" />
            Free · No account needed
          </span>
        }
      />

      <div className="mx-auto max-w-lg space-y-4">
        {/* address builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Choose your address
            </CardTitle>
            <CardDescription>
              Pick a username and domain, or shuffle for a random one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* username + domain row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="username"
                  className="pr-9 font-mono text-sm"
                  aria-label="Username"
                />
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Random username"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="shrink-0 text-sm font-semibold text-muted-foreground">@</span>

              {domainsQuery.isLoading ? (
                <Skeleton className="h-10 w-36" />
              ) : (
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Domain"
                >
                  {(domainsQuery.data ?? []).map((d) => (
                    <option key={d.id} value={d.domain}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* full address preview */}
            {address && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 truncate font-mono text-sm font-semibold">{address}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(address, 'Address copied!')}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* generated password (hidden by default) */}
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Auto-generated password</p>
                <p className={`font-mono text-sm ${showPassword ? '' : 'blur-sm select-none'}`}>
                  {generatedPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              className="w-full gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              onClick={handleCreate}
              disabled={!address || createAccount.isPending}
            >
              {createAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : createAccount.isSuccess ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {createAccount.isPending ? 'Creating mailbox…' : 'Create & open inbox'}
            </Button>
          </CardContent>
        </Card>

        {/* how it works */}
        <Card variant="muted">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">How it works</p>
            {[
              { step: '1', text: 'Choose or randomise a username and domain above' },
              { step: '2', text: 'Click "Create & open inbox" mailbox is live instantly' },
              { step: '3', text: 'Share the address to receive emails in the live inbox' },
              { step: '4', text: 'Inbox auto-refreshes every 15 seconds. Expires after inactivity.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {item.step}
                </span>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
