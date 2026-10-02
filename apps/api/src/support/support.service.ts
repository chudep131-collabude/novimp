import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/common/logger/logger.service';
import { TicketCategory, TicketPriority, TicketStatus, UserRole } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async createTicket(
    userId: string,
    data: {
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
      orderId?: string;
    },
  ) {
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        orderId: data.orderId,
        status: 'OPEN',
      },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(`Ticket created: ${ticketNumber} by ${userId}`, 'SupportService');
    return ticket;
  }

  async getTickets(userId: string, role: UserRole, page = 1, limit = 20, status?: TicketStatus) {
    const where: any = role === 'CUSTOMER' ? { userId } : {};
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  }

  async getTicket(ticketId: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (role === 'CUSTOMER' && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async addMessage(
    ticketId: string,
    userId: string,
    role: UserRole,
    content: string,
    isInternal = false,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (role === 'CUSTOMER' && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Customers cannot send internal messages
    if (role === 'CUSTOMER' && isInternal) {
      throw new ForbiddenException('Cannot send internal messages');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        content,
        isInternal,
      },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Update ticket status
    let newStatus = ticket.status;
    if (role === 'CUSTOMER') {
      newStatus = 'OPEN';
    } else if (ticket.status === 'OPEN' || ticket.status === 'WAITING_CUSTOMER') {
      newStatus = 'IN_PROGRESS';
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, updatedAt: new Date() },
    });

    return message;
  }

  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    adminId: string,
  ) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        assignedTo: status === 'IN_PROGRESS' ? adminId : undefined,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    this.logger.log(`Ticket ${ticket.ticketNumber} status updated to ${status}`, 'SupportService');
    return ticket;
  }

  async assignTicket(ticketId: string, adminId: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: adminId,
        status: 'IN_PROGRESS',
      },
    });
  }

  async getTicketStats() {
    const [open, inProgress, waiting, resolved, byPriority] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'WAITING_CUSTOMER' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
    ]);

    return {
      open,
      inProgress,
      waitingCustomer: waiting,
      resolved,
      byPriority: byPriority.map(p => ({
        priority: p.priority,
        count: p._count.id,
      })),
    };
  }
}
