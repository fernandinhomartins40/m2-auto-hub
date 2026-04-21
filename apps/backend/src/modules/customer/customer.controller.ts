import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@config/database.js';
import {
  Address,
  Customer,
  Order,
  OrderItem,
  OrderItemType,
  OrderSource,
  OrderStatus,
  QuoteStatus,
} from '@prisma/client';
import notificationsService from '@modules/notifications/notifications.service.js';
import pdfGeneratorService from '@shared/services/pdf-generator.service.js';

const exportQuotePdfSchema = z.object({
  html: z
    .string()
    .trim()
    .min(1, 'HTML do PDF e obrigatorio')
    .max(2_000_000, 'HTML do PDF excede o limite suportado'),
  filename: z.string().trim().min(1).max(120).optional(),
});

const createQuoteSchema = z.object({
  addressId: z.string().uuid('Endereco invalido').optional(),
  observations: z.string().trim().max(2000, 'Observacoes muito longas').optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid('Servico invalido'),
        quantity: z.coerce.number().int().min(1).max(50),
        observations: z.string().trim().max(1000, 'Observacoes do item muito longas').optional(),
      })
    )
    .min(1, 'Adicione ao menos um servico ao orçamento'),
});

type QuoteOrderWithRelations = Order & {
  items: OrderItem[];
  address: Address;
  customer: Pick<Customer, 'name' | 'phone' | 'email'>;
};

export class CustomerController {
  private getAuthenticatedCustomerId(req: Request, res: Response): string | null {
    const customerId = req.user?.customerId;

    if (!customerId) {
      res.status(401).json({ error: 'Cliente nao autenticado' });
      return null;
    }

    return customerId;
  }

  private mapQuote(order: QuoteOrderWithRelations) {
    return {
      id: order.id,
      userId: order.customerId,
      customerName: order.customer.name,
      customerWhatsApp: order.customer.phone,
      items: order.items
        .filter((item) => item.type === OrderItemType.SERVICE || !!item.serviceId)
        .map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
          priceQuoted: item.priceQuoted,
          observations: null,
        })),
      total: Number(order.total),
      status: order.quoteStatus || QuoteStatus.PENDING,
      observations: order.quoteNotes || null,
      quoteNotes: order.quoteNotes || null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      quotedAt: order.quotedAt?.toISOString() || null,
      quoteApprovedAt: order.quoteApprovedAt?.toISOString() || null,
      source: order.source,
      address: order.address
        ? {
            id: order.address.id,
            street: order.address.street,
            number: order.address.number,
            complement: order.address.complement,
            neighborhood: order.address.neighborhood,
            city: order.address.city,
            state: order.address.state,
            zipCode: order.address.zipCode,
            type: order.address.type,
          }
        : null,
    };
  }

  private async getOwnedQuote(customerId: string, id: string) {
    const quote = (await prisma.order.findFirst({
      where: {
        id,
        customerId,
        hasServices: true,
        quoteStatus: { not: null },
      },
      include: {
        items: true,
        address: true,
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    })) as QuoteOrderWithRelations | null;

    if (!quote) {
      return null;
    }

    return quote;
  }

  // ==================== QUOTES ====================

  getMyQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      if (!customerId) {
        return;
      }

      const { status } = req.query;

      const where: any = {
        customerId,
        hasServices: true,
        quoteStatus: { not: null },
      };

      if (status && status !== 'all') {
        where.quoteStatus = String(status).toUpperCase();
      }

      const quotes = (await prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          customer: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })) as QuoteOrderWithRelations[];

      res.json(quotes.map((quote) => this.mapQuote(quote)));
    } catch (error) {
      next(error);
    }
  };

  getMyQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      const { id } = req.params;

      if (!customerId) {
        return;
      }

      const quote = await this.getOwnedQuote(customerId, id);

      if (!quote) {
        res.status(404).json({ error: 'Orcamento nao encontrado' });
        return;
      }

      res.json(this.mapQuote(quote));
    } catch (error) {
      next(error);
    }
  };

  createMyQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      if (!customerId) {
        return;
      }

      const payload = createQuoteSchema.parse(req.body);

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true },
      });

      if (!customer) {
        res.status(404).json({ error: 'Cliente nao encontrado' });
        return;
      }

      const serviceIds = payload.items.map((item) => item.serviceId);
      if (new Set(serviceIds).size !== serviceIds.length) {
        res.status(400).json({ error: 'Nao e permitido repetir o mesmo servico na solicitacao' });
        return;
      }

      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
      });

      if (services.length !== serviceIds.length) {
        res.status(404).json({ error: 'Um ou mais servicos nao foram encontrados' });
        return;
      }

      for (const item of payload.items) {
        const service = services.find((entry) => entry.id === item.serviceId);
        if (!service) {
          res.status(404).json({ error: 'Um ou mais servicos nao foram encontrados' });
          return;
        }

        if (service.status !== 'ACTIVE') {
          res.status(400).json({ error: `O servico ${service.name} nao esta disponivel` });
          return;
        }
      }

      let addressId = payload.addressId;

      if (addressId) {
        const ownedAddress = await prisma.address.findFirst({
          where: {
            id: addressId,
            customerId,
          },
        });

        if (!ownedAddress) {
          res.status(400).json({ error: 'O endereco informado nao pertence ao cliente autenticado' });
          return;
        }
      }

      if (!addressId) {
        const defaultAddress = await prisma.address.findFirst({
          where: { customerId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        if (!defaultAddress) {
          res.status(400).json({
            error:
              'Cadastre ou selecione um endereco antes de solicitar um orcamento.',
          });
          return;
        }

        addressId = defaultAddress.id;
      }

      const servicesMap = new Map(services.map((service) => [service.id, service]));
      const orderItems = payload.items.map((item) => {
        const service = servicesMap.get(item.serviceId)!;
        const estimatedPrice = service.basePrice ? Number(service.basePrice) : 0;

        return {
          serviceId: service.id,
          type: OrderItemType.SERVICE,
          name: service.name,
          quantity: item.quantity,
          price: estimatedPrice,
          subtotal: estimatedPrice * item.quantity,
          quotedPrice: null,
          priceQuoted: false,
        };
      });

      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

      const quote = (await prisma.order.create({
        data: {
          customerId,
          addressId,
          source: OrderSource.APP,
          status: OrderStatus.PENDING,
          hasProducts: false,
          hasServices: true,
          quoteStatus: QuoteStatus.PENDING,
          subtotal,
          discountAmount: 0,
          total: subtotal,
          paymentMethod: 'A_DEFINIR',
          quoteNotes: payload.observations || null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          address: true,
          customer: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      })) as QuoteOrderWithRelations;

      try {
        await notificationsService.notifyNewQuoteRequest(quote.id, customer.name);
      } catch (notificationError) {
        console.error('Failed to notify admins about new quote request:', notificationError);
      }

      res.status(201).json(this.mapQuote(quote));
    } catch (error) {
      next(error);
    }
  };

  exportMyQuotePdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      if (!customerId) {
        return;
      }

      const { id } = req.params;
      const { html, filename } = exportQuotePdfSchema.parse(req.body);
      const quote = await this.getOwnedQuote(customerId, id);

      if (!quote) {
        res.status(404).json({ error: 'Orcamento nao encontrado' });
        return;
      }

      const pdfBuffer = await pdfGeneratorService.generatePdfBuffer({
        title: `Orcamento ${quote.id}`,
        bodyHtml: html,
      });

      const safeFilename = pdfGeneratorService.sanitizeFilename(
        filename || `orcamento-${quote.id.slice(0, 8)}`
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  approveMyQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      const { id } = req.params;

      if (!customerId) {
        return;
      }

      const quote = await prisma.order.findFirst({
        where: {
          id,
          customerId,
        },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!quote) {
        res.status(404).json({ error: 'Orcamento nao encontrado' });
        return;
      }

      if (quote.quoteStatus !== QuoteStatus.QUOTED) {
        res.status(400).json({ error: 'Apenas orcamentos no status QUOTED podem ser aprovados' });
        return;
      }

      const updatedQuote = await prisma.order.update({
        where: { id },
        data: {
          quoteStatus: QuoteStatus.APPROVED,
          quoteApprovedAt: new Date(),
          status: OrderStatus.IN_PRODUCTION,
        },
        include: {
          items: true,
        },
      });

      try {
        await notificationsService.notifyQuoteApproved(updatedQuote.id, quote.customer.name);
      } catch (notificationError) {
        console.error('Failed to notify admins about quote approval:', notificationError);
      }

      res.json({
        id: updatedQuote.id,
        status: updatedQuote.quoteStatus,
        orderStatus: updatedQuote.status,
        message: 'Orcamento aprovado com sucesso! Seu pedido ja esta em producao.',
      });
    } catch (error) {
      next(error);
    }
  };

  rejectMyQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      const { id } = req.params;

      if (!customerId) {
        return;
      }

      const quote = await prisma.order.findFirst({
        where: {
          id,
          customerId,
        },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!quote) {
        res.status(404).json({ error: 'Orcamento nao encontrado' });
        return;
      }

      if (quote.quoteStatus !== QuoteStatus.QUOTED) {
        res.status(400).json({ error: 'Apenas orcamentos no status QUOTED podem ser rejeitados' });
        return;
      }

      const updatedQuote = await prisma.order.update({
        where: { id },
        data: {
          quoteStatus: QuoteStatus.REJECTED,
        },
      });

      try {
        await notificationsService.notifyQuoteRejected(updatedQuote.id, quote.customer.name);
      } catch (notificationError) {
        console.error('Failed to notify admins about quote rejection:', notificationError);
      }

      res.json({
        id: updatedQuote.id,
        status: updatedQuote.quoteStatus,
        message: 'Orcamento rejeitado.',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== ORDERS ====================

  getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);

      if (!customerId) {
        return;
      }

      const orders = await prisma.order.findMany({
        where: {
          customerId,
          OR: [
            { hasProducts: true },
            { status: { in: ['IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED'] } },
          ],
        },
        include: {
          items: true,
          address: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const mappedOrders = orders.map((order: Order & { items: OrderItem[] }) => ({
        id: order.id,
        status: order.status,
        quoteStatus: order.quoteStatus,
        hasProducts: order.hasProducts,
        hasServices: order.hasServices,
        total: Number(order.total),
        items: order.items.map((item: OrderItem) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          type: item.productId ? 'product' : 'service',
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }));

      res.json(mappedOrders);
    } catch (error) {
      next(error);
    }
  };

  getMyOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = this.getAuthenticatedCustomerId(req, res);
      const { id } = req.params;

      if (!customerId) {
        return;
      }

      const order = (await prisma.order.findFirst({
        where: {
          id,
          customerId,
        },
        include: {
          items: true,
          address: true,
        },
      })) as (Order & { items: OrderItem[]; address: Address }) | null;

      if (!order) {
        res.status(404).json({ error: 'Pedido nao encontrado' });
        return;
      }

      res.json({
        id: order.id,
        status: order.status,
        quoteStatus: order.quoteStatus,
        hasProducts: order.hasProducts,
        hasServices: order.hasServices,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        paymentMethod: order.paymentMethod,
        items: order.items.map((item: OrderItem) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          type: item.productId ? 'product' : 'service',
        })),
        address: order.address,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
