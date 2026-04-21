import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import notificationsService from '../notifications/notifications.service.js';
import { z } from 'zod';
import pdfGeneratorService from '@shared/services/pdf-generator.service.js';
import alprService from '@shared/services/alpr.service.js';

const exportQuotePdfSchema = z.object({
  html: z.string().trim().min(1, 'HTML do PDF é obrigatório').max(2_000_000, 'HTML do PDF excede o limite suportado'),
  filename: z.string().trim().min(1).max(120).optional(),
});

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  // ==================== DASHBOARD ====================

  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  // ==================== ORDERS ====================

  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const result = await this.adminService.getOrders({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.adminService.getOrderById(id);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await this.adminService.updateOrderStatus(id, status);

      // Notify customer about order status update
      try {
        await notificationsService.notifyOrderStatusUpdated(
          order.userId,
          order.id,
          status
        );
      } catch (error) {
        console.error('Failed to send order status notification:', error);
        // Don't fail the update if notification fails
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId, addressId, customerData, address, items, paymentMethod, couponCode } = req.body;

      if (!items || items.length === 0) {
        res.status(400).json({ error: 'Itens são obrigatórios' });
        return;
      }

      if (!customerId && !customerData) {
        res.status(400).json({ error: 'É necessário fornecer um cliente existente ou os dados de um novo cliente' });
        return;
      }

      if (!paymentMethod) {
        res.status(400).json({ error: 'Forma de pagamento é obrigatória' });
        return;
      }

      const order = await this.adminService.createOrder({
        customerId,
        addressId,
        customerData,
        address,
        items,
        paymentMethod,
        couponCode,
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CUSTOMERS ====================

  getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, search, level, status } = req.query;
      const result = await this.adminService.getCustomers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        level: level as string,
        status: status as string
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const customer = await this.adminService.getCustomerById(id);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  };

  updateCustomerLevel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { level } = req.body;
      const customer = await this.adminService.updateCustomerLevel(id, level);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  };

  updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const customer = await this.adminService.updateCustomerStatus(id, status);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  };

  createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, phone, cpf } = req.body;

      if (!name || !email || !phone) {
        res.status(400).json({ error: 'Nome, email e telefone são obrigatórios' });
        return;
      }

      const customer = await this.adminService.createCustomer({
        name,
        email,
        phone,
        cpf
      });

      res.status(201).json(customer);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CUSTOMER ADDRESSES ====================

  createCustomerAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId } = req.params;
      const { street, number, complement, neighborhood, city, state, zipCode, type } = req.body;

      if (!street || !number || !neighborhood || !city || !state || !zipCode) {
        res.status(400).json({ error: 'Rua, número, bairro, cidade, estado e CEP são obrigatórios' });
        return;
      }

      const address = await this.adminService.createCustomerAddress(customerId, {
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        type: type || 'HOME'
      });

      res.status(201).json(address);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CUSTOMER VEHICLES ====================

  lookupVehicleByPlate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { plate } = req.query;

      if (!plate || typeof plate !== 'string') {
        res.status(400).json({ error: 'Placa e obrigatoria' });
        return;
      }

      const result = await this.adminService.lookupVehicleByPlate(plate);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  recognizeVehiclePlate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Imagem da placa e obrigatoria' });
        return;
      }

      const result = await alprService.recognizeVehiclePlateImage({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'plate-capture.jpg',
        contentType: req.file.mimetype,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCustomerVehicles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId } = req.params;
      const vehicles = await this.adminService.getCustomerVehicles(customerId);
      res.json({ data: vehicles });
    } catch (error) {
      next(error);
    }
  };

  createVehicleForCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId } = req.params;
      const { brand, model, year, plate, color, mileage, chassisNumber } = req.body;

      if (!brand || !model || !year || !plate || !color) {
        res.status(400).json({ error: 'Marca, modelo, ano, placa e cor são obrigatórios' });
        return;
      }

      const vehicle = await this.adminService.createVehicleForCustomer(customerId, {
        brand,
        model,
        year: Number(year),
        plate,
        color,
        mileage: mileage ? Number(mileage) : undefined,
        chassisNumber
      });

      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error('Error in createVehicleForCustomer controller:', error);

      // Retornar erro específico
      if (error.message === 'Cliente não encontrado') {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error.message === 'Já existe um veículo cadastrado com esta placa') {
        res.status(409).json({ error: error.message });
        return;
      }

      if (error.message === 'Placa invalida') {
        res.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  };

  // ==================== QUOTES (ORÇAMENTOS) ====================

  getQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const result = await this.adminService.getQuotes({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const quote = await this.adminService.getQuoteById(id);
      res.json(quote);
    } catch (error) {
      next(error);
    }
  };

  exportQuotePdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { html, filename } = exportQuotePdfSchema.parse(req.body);
      const quote = await this.adminService.getQuoteById(id);
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

  updateQuotePrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { items } = req.body;
      const order = await this.adminService.updateQuotePrices(id, items);

      try {
        await notificationsService.notifyQuoteResponded(order.customerId, order.id);
      } catch (notificationError) {
        console.error('Failed to notify customer about quote response:', notificationError);
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  approveQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.adminService.approveQuote(id);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  rejectQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.adminService.rejectQuote(id);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  updateQuoteStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await this.adminService.updateQuoteStatus(id, status);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  createQuote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId, addressId, customerData, items, observations, validityDays, address, sendToClient } = req.body;

      if (!items || items.length === 0) {
        res.status(400).json({ error: 'Itens são obrigatórios' });
        return;
      }

      if (!customerId && !customerData) {
        res.status(400).json({ error: 'É necessário fornecer um cliente existente ou dados de novo cliente' });
        return;
      }

      const quote = await this.adminService.createQuote({
        customerId,
        addressId,
        customerData,
        items,
        observations,
        validityDays,
        address,
        sendToClient
      });

      if (sendToClient) {
        try {
          await notificationsService.notifyQuoteResponded(quote.userId, quote.id);
        } catch (notificationError) {
          console.error('Failed to notify customer about quote creation:', notificationError);
        }
      }

      res.status(201).json(quote);
    } catch (error) {
      next(error);
    }
  };
}
