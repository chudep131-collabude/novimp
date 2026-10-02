'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircleQuestion,
  MessageCircle,
  Clock,
  Send,
  Loader2,
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
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
  user?: { firstName: string; lastName: string; email: string };
  _count?: { messages: number };
}

interface TicketMessage {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null; email: string; role: string } | null;
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>}>
      <AdminTicketsInner />
    </Suspense>
  );
}

function AdminTicketsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTicketId = searchParams.get('ticket');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: () =>
      api.get<{ tickets: Ticket[]; total: number }>(`/support/tickets${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then((r) => r.data),
  });

  const tickets = ticketsQuery.data?.tickets ?? [];

  const openTicket = (id: string) => {
    router.push(`/admin/tickets?ticket=${id}`);
  };

  const closeTicket = () => {
    router.push('/admin/tickets');
  };

  if (selectedTicketId) {
    return (
      <AdminTicketDetail
        ticketId={selectedTicketId}
        onBack={closeTicket}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Manage customer inquiries and requests."
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING_CUSTOMER">Waiting Customer</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {ticketsQuery.isError ? (
        <ErrorState
          error={ticketsQuery.error}
          title="Could not load tickets"
          onRetry={() => ticketsQuery.refetch()}
        />
      ) : ticketsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No tickets found"
          description="There are currently no tickets matching the criteria."
        />
      ) : (
        <StaggerList className="space-y-3">
          {tickets.map((ticket) => (
            <StaggerItem key={ticket.id}>
              <Card
                interactive
                className="hover:border-border"
                role="button"
                tabIndex={0}
                onClick={() => openTicket(ticket.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openTicket(ticket.id);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{ticket.ticketNumber}</span>
                        <Badge variant={variantForStatus(ticket.status, ticketStatusVariant)}>
                          {humanizeStatus(ticket.status)}
                        </Badge>
                        <Badge
                          variant={variantForStatus(ticket.priority, ticketPriorityVariant)}
                          className="capitalize"
                        >
                          {ticket.priority.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          {ticket.user?.email || 'Unknown User'}
                        </span>
                      </div>
                      <p className="truncate font-medium">{ticket.subject}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {ticket.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(ticket.createdAt)}
                        </span>
                        <span>{ticket._count?.messages || 0} messages</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

function AdminTicketDetail({
  ticketId,
  onBack,
}: {
  ticketId: string;
  onBack: () => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    data: ticket,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: () =>
      api
        .get<Ticket & { messages: TicketMessage[] }>(`/support/tickets/${ticketId}`)
        .then((r) => r.data),
  });

  const addMessage = useMutation({
    mutationFn: (data: { content: string; isInternal: boolean }) =>
      api
        .post(`/support/tickets/${ticketId}/messages`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setNewMessage('');
      setIsInternal(false);
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Message failed',
        description: getErrorMessage(err),
      }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api
        .put(`/support/tickets/${ticketId}/status`, { status })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast({ title: 'Status updated' });
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: getErrorMessage(err),
      }),
  });

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const send = () => {
    const content = newMessage.trim();
    if (content) addMessage.mutate({ content, isInternal });
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

  const messages = ticket?.messages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to tickets
        </Button>
        {ticket && (
          <div className="flex items-center gap-2">
             <Select
              value={ticket.status}
              onValueChange={(val) => updateStatus.mutate(val)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING_CUSTOMER">Waiting Customer</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading || !ticket ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
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
                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                  <UserIcon className="h-4 w-4" />
                  {ticket.user?.email || 'Unknown User'}
                </div>
              </div>
              <CardTitle>{ticket.subject}</CardTitle>
              <CardDescription>{ticket.description}</CardDescription>
            </CardHeader>
          </Card>

          {/* Message thread */}
          <ScrollArea className="max-h-[480px] rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="space-y-4">
              {/* Original message */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{ticket.user?.firstName || ticket.user?.email || 'Customer'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{ticket.description}</p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {messages.map((msg) => {
                const isCustomer = msg.user?.role === 'CUSTOMER';
                const internal = msg.isInternal;
                
                let containerClass = 'bg-muted/50';
                let iconClass = 'bg-primary/10 text-primary';
                
                if (internal) {
                  containerClass = 'border border-amber-500/20 bg-amber-500/10';
                  iconClass = 'bg-amber-500/20 text-amber-500';
                } else if (!isCustomer) {
                  containerClass = 'border border-emerald-500/20 bg-emerald-500/10';
                  iconClass = 'bg-emerald-500/20 text-emerald-500';
                }

                return (
                  <div key={msg.id} className={`rounded-lg p-4 ${containerClass}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                        {isCustomer ? <UserIcon className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {isCustomer ? (msg.user?.firstName || 'Customer') : (msg.user?.firstName || 'Staff')}
                          </span>
                          {internal && (
                            <Badge variant="outline" className="text-[10px] uppercase h-5 text-amber-500 border-amber-500/50">
                              Internal Note
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Switch 
                id="internal-mode" 
                checked={isInternal} 
                onCheckedChange={setIsInternal} 
              />
              <Label htmlFor="internal-mode" className="text-sm text-muted-foreground cursor-pointer">
                Internal Note (hidden from customer)
              </Label>
            </div>
            
            <div className="flex gap-3">
              <Input
                placeholder={isInternal ? "Type an internal note..." : "Type your message to the customer... (Enter to send)"}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className={`flex-1 ${isInternal ? 'border-amber-500/50 focus-visible:ring-amber-500' : ''}`}
                aria-label="Message"
                disabled={addMessage.isPending}
              />
              <Button
                onClick={send}
                disabled={addMessage.isPending || !newMessage.trim()}
                aria-label="Send message"
                variant={isInternal ? "secondary" : "default"}
                className={isInternal ? 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30' : ''}
              >
                {addMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
