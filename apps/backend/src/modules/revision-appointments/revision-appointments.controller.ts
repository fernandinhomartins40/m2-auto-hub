import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import revisionAppointmentsService from './revision-appointments.service.js';

const appointmentStatusSchema = z.enum([
  'REQUESTED',
  'SCHEDULED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
]);

const customerAppointmentSchema = z.object({
  vehicleId: z.string().uuid('Veiculo invalido'),
  preferredDate: z.string().datetime('Data preferencial invalida'),
  notes: z.string().trim().max(2000, 'Observacoes muito longas').optional(),
});

const appointmentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  vehicleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  assignedMechanicId: z.string().uuid().optional(),
  status: appointmentStatusSchema.optional(),
  dateFrom: z
    .string()
    .datetime()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  dateTo: z
    .string()
    .datetime()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
});

const scheduleAppointmentSchema = z.object({
  scheduledAt: z.string().datetime('Data e horario agendados invalidos'),
  assignedMechanicId: z.string().uuid('Mecanico invalido'),
  adminNotes: z.string().trim().max(2000, 'Observacoes internas muito longas').optional(),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(2000, 'Motivo muito longo').optional(),
});

export class RevisionAppointmentsController {
  getCustomerAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        throw new Error('Customer not authenticated');
      }

      const filters = appointmentFiltersSchema.parse(req.query) as any;
      const result = await revisionAppointmentsService.getCustomerAppointments(customerId, filters);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCustomerAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        throw new Error('Customer not authenticated');
      }

      const appointment = await revisionAppointmentsService.getCustomerAppointmentById(
        customerId,
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  createCustomerAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        throw new Error('Customer not authenticated');
      }

      const payload = customerAppointmentSchema.parse(req.body);
      const appointment = await revisionAppointmentsService.createCustomerAppointment(
        customerId,
        payload
      );

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelCustomerAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        throw new Error('Customer not authenticated');
      }

      const { reason } = cancelAppointmentSchema.parse(req.body || {});
      const appointment = await revisionAppointmentsService.cancelCustomerAppointment(
        customerId,
        req.params.id,
        reason
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const filters = appointmentFiltersSchema.parse(req.query) as any;
      const result = await revisionAppointmentsService.getAdminAppointments(
        filters,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const appointment = await revisionAppointmentsService.getAdminAppointmentById(
        req.params.id,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  scheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const payload = scheduleAppointmentSchema.parse(req.body);
      const appointment = await revisionAppointmentsService.scheduleAppointment(
        req.params.id,
        payload,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelAdminAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const { reason } = cancelAppointmentSchema.parse(req.body || {});
      const appointment = await revisionAppointmentsService.cancelAdminAppointment(
        req.params.id,
        req.admin.role,
        req.admin.adminId,
        reason
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

  startAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const appointment = await revisionAppointmentsService.startAppointment(
        req.params.id,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new RevisionAppointmentsController();
