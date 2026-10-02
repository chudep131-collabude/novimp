'use client';

import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from '@/hooks/use-toast';
import { formatDate, formatRelativeTime } from '@/lib/format';
import {
  ticketStatusVariant,
  ticketPriorityVariant,
  variantForStatus,
  humanizeStatus,
} from '@/lib/status';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircleQuestion,
  Plus,
  MessageCircle,
  Clock,
  Send,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface TicketMessage {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role: string;
  } | null;
}

const ticketSchema = z.object({
  subject: z.string().min(4, 'Subject must be at least 4 characters').max(120),
  description: z
    .string()
    .min(10, 'Please describe your issue (min 10 characters)')
    .max(4000),
  category: z.enum(['GENERAL', 'ORDER_ISSUE', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'REFUND']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      }
    >
      <SupportPageInner />
    </Suspense>
  );
}

function SupportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTicketId = searchParams.get('ticket');

  const [showNewTicket, setShowNewTicket] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const ticketsQuery = useQuery({
    queryKey: ['tickets'],
    queryFn: () =>
      api.get<{ tickets: Ticket[]; total: number }>('/support/tickets').then((r) => r.data),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const createTicket = useMutation({
    mutationFn: (data: TicketFormValues) =>
      api.post('/support/tickets', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowNewTicket(false);
      toast({ title: 'Ticket created', description: 'Our team will get back to you shortly.' });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Could not create ticket',
        description: getErrorMessage(error),
      }),
  });

  const tickets = ticketsQuery.data?.tickets ?? [];

  const openTicket = (id: string) => {
    router.push(`/support?ticket=${id}`);
  };

  const closeTicket = () => {
    router.push('/support');
  };

  if (selectedTicketId) {
    return (
      <TicketDetail
        ticketId={selectedTicketId}
        onBack={closeTicket}
        currentUserRole={user?.role}
      />
    );
  }

  return (
    <StaggerList className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Support"
          description="Get help with your orders and account."
          actions={
            <Button onClick={() => setShowNewTicket(true)} disabled={showNewTicket}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          }
        />
      </StaggerItem>

      {showNewTicket && (
        <StaggerItem>
          <NewTicketForm
            onSubmit={(data) => createTicket.mutate(data)}
            onCancel={() => setShowNewTicket(false)}
            isSubmitting={createTicket.isPending}
          />
        </StaggerItem>
      )}

      <StaggerItem>
        {ticketsQuery.isError ? (
          <ErrorState
            error={ticketsQuery.error}
            title="Could not load tickets"
            onRetry={() => ticketsQuery.refetch()}
          />
        ) : ticketsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={MessageCircleQuestion}
            title="No tickets yet"
            description="Create a ticket if you need assistance."
            action={
              <Button onClick={() => setShowNewTicket(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Ticket
              </Button>
            }
          />
        ) : (
          <StaggerList className="space-y-3">
            {tickets.map((ticket) => (
              <StaggerItem key={ticket.id}>
                <button
                  type="button"
                  className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                  onClick={() => openTicket(ticket.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openTicket(ticket.id); }}
                >
                  <Card interactive className="rounded-2xl transition-all duration-200 group-hover:border-primary/30">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Status indicator dot */}
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                          <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{ticket.ticketNumber}</span>
                            <Badge variant={variantForStatus(ticket.status, ticketStatusVariant)}>
                              {humanizeStatus(ticket.status)}
                            </Badge>
                            <Badge variant={variantForStatus(ticket.priority, ticketPriorityVariant)} className="capitalize">
                              {ticket.priority.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-foreground">{ticket.subject}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{ticket.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              {formatRelativeTime(ticket.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" aria-hidden />
                              {ticket._count?.messages || 0} messages
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </StaggerItem>
    </StaggerList>
  );
}

function NewTicketForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (data: TicketFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Support Ticket</CardTitle>
        <CardDescription>Tell us what happened and we&apos;ll jump in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              aria-invalid={!!errors.subject}
              {...register('subject')}
            />
            {errors.subject && (
              <p className="text-xs text-destructive" role="alert">{errors.subject.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="ORDER_ISSUE">Order Issue</SelectItem>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                      <SelectItem value="ACCOUNT">Account</SelectItem>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your issue in detail..."
              rows={4}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive" role="alert">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TicketDetail({
  ticketId,
  onBack,
  currentUserRole,
}: {
  ticketId: string;
  onBack: () => void;
  currentUserRole?: string;
}) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: ticket,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () =>
      api
        .get<Ticket & { messages: TicketMessage[] }>(`/support/tickets/${ticketId}`)
        .then((r) => r.data),
    // Poll every 15 seconds so new staff replies appear without a manual refresh
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const addMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/support/tickets/${ticketId}/messages`, { content }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setNewMessage('');
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Message failed',
        description: getErrorMessage(err),
      }),
  });

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const send = () => {
    const content = newMessage.trim();
    if (content) addMessage.mutate(content);
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to tickets
        </Button>
        <ErrorState error={error} title="Could not load ticket" onRetry={() => refetch()} />
      </div>
    );
  }

  // Filter out internal messages for non-admin users
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPPORT';
  const visibleMessages = ticket?.messages?.filter((msg) => isAdmin || !msg.isInternal) ?? [];

  const isClosed = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to tickets
      </Button>

      {isLoading || !ticket ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : (
        <>
          {/* Ticket header */}
          <Card>
            <CardHeader>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {ticket.ticketNumber}
                </span>
                <Badge variant={variantForStatus(ticket.status, ticketStatusVariant)}>
                  {humanizeStatus(ticket.status)}
                </Badge>
                <Badge
                  variant={variantForStatus(ticket.priority, ticketPriorityVariant)}
                  className="capitalize"
                >
                  {ticket.priority.toLowerCase()}
                </Badge>
              </div>
              <CardTitle>{ticket.subject}</CardTitle>
              <CardDescription>{ticket.description}</CardDescription>
            </CardHeader>
          </Card>

          {/* Message thread */}
          <ScrollArea className="max-h-[480px] rounded-lg border bg-muted/20 p-4">
            <div className="space-y-4">
              {/* Original message */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">You</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{ticket.description}</p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {visibleMessages.map((msg) => {
                const isCustomer = msg.user?.role === 'CUSTOMER';
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-4 ${
                      isCustomer ? 'bg-muted/50' : 'border border-success/20 bg-success/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isCustomer ? 'bg-primary/10' : 'bg-success/10'
                        }`}
                      >
                        <MessageCircle
                          className={`h-4 w-4 ${isCustomer ? 'text-primary' : 'text-success'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {isCustomer ? 'You' : msg.user?.firstName || 'Support Agent'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Reply box */}
          {isClosed ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              This ticket is {ticket.status.toLowerCase()}. Open a new ticket if you need further
              help.
            </div>
          ) : (
            <div className="flex gap-3">
              <Input
                placeholder="Type your message… (Enter to send)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="flex-1"
                aria-label="Message"
                disabled={addMessage.isPending}
              />
              <Button
                onClick={send}
                disabled={addMessage.isPending || !newMessage.trim()}
                aria-label="Send message"
              >
                {addMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
