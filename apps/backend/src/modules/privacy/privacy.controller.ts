import type { NextFunction, Request, Response } from 'express';
import {
  ConsentPurpose,
  PrivacyRequestStatus,
  PrivacyRequestType,
  SecurityIncidentSeverity,
  SecurityIncidentStatus,
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';

const POLICY_VERSION = '2026-09-30';
const requestSchema = z.object({
  type: z.nativeEnum(PrivacyRequestType),
  details: z.string().trim().max(2000).optional(),
});
const consentSchema = z.object({
  subjectKey: z.string().uuid(),
  choices: z.object({ analytics: z.boolean(), marketing: z.boolean() }),
  policyVersion: z.literal(POLICY_VERSION),
});
const requestUpdateSchema = z.object({
  status: z.nativeEnum(PrivacyRequestStatus),
  response: z.string().trim().max(5000).optional(),
  identityVerified: z.boolean().optional(),
});
const incidentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10000),
  severity: z.nativeEnum(SecurityIncidentSeverity),
  detectedAt: z.coerce.date(),
  affectedDataCategories: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  estimatedSubjects: z.number().int().nonnegative().optional(),
  riskAssessment: z.string().trim().max(10000).optional(),
  containmentActions: z.string().trim().max(10000).optional(),
  notificationRequired: z.boolean().optional(),
});
const incidentUpdateSchema = incidentSchema.partial().extend({
  status: z.nativeEnum(SecurityIncidentStatus).optional(),
  notifiedAnpdAt: z.coerce.date().nullable().optional(),
  notifiedSubjectsAt: z.coerce.date().nullable().optional(),
});

function safeExport<T>(value: T): T {
  if (Array.isArray(value)) return value.map(safeExport) as T;
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/(password|token|secret|authorization)/i.test(key)) continue;
    result[key] = safeExport(child);
  }
  return result as T;
}

export class PrivacyController {
  getNotice = (_req: Request, res: Response) => {
    res.json({
      policyVersion: POLICY_VERSION,
      controller: 'M2 Center Auto',
      contact: process.env.PRIVACY_CONTACT_EMAIL || null,
      purposes: ['execucao de pedidos e servicos', 'atendimento', 'seguranca', 'obrigacoes legais', 'marketing opcional'],
      rights: Object.values(PrivacyRequestType),
    });
  };

  recordConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = consentSchema.parse(req.body);
      const common = {
        subjectKey: input.subjectKey,
        policyVersion: input.policyVersion,
        source: 'web',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500),
      };
      await prisma.$transaction([
        prisma.consentRecord.create({ data: { ...common, purpose: ConsentPurpose.ESSENTIAL, granted: true } }),
        prisma.consentRecord.create({ data: { ...common, purpose: ConsentPurpose.ANALYTICS, granted: input.choices.analytics } }),
        prisma.consentRecord.create({ data: { ...common, purpose: ConsentPurpose.MARKETING, granted: input.choices.marketing } }),
      ]);
      res.status(201).json({ success: true });
    } catch (error) { next(error); }
  };

  exportMyData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.user!.customerId;
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          addresses: true, orders: { include: { items: true } }, serviceOrders: true,
          favorites: true, vehicles: true, revisions: true, revisionAppointments: true,
          supportTickets: { include: { messages: true } }, loyaltyTransactions: true,
          loyaltyRedemptions: true, relationshipMessages: true, privacyRequests: true,
          consentRecords: true,
        },
      });
      if (!customer) throw ApiError.notFound('Titular nao encontrado');
      res.setHeader('Content-Disposition', `attachment; filename="meus-dados-${customerId}.json"`);
      res.json({ generatedAt: new Date().toISOString(), policyVersion: POLICY_VERSION, data: safeExport(customer) });
    } catch (error) { next(error); }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = requestSchema.parse(req.body);
      const openDuplicate = await prisma.privacyRequest.findFirst({
        where: { customerId: req.user!.customerId, type: input.type, status: { in: [PrivacyRequestStatus.OPEN, PrivacyRequestStatus.IDENTITY_CHECK, PrivacyRequestStatus.IN_REVIEW] } },
      });
      if (openDuplicate) throw ApiError.conflict('Ja existe uma solicitacao aberta deste tipo');
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 15);
      const request = await prisma.privacyRequest.create({ data: { customerId: req.user!.customerId, type: input.type, details: input.details, dueAt } });
      res.status(201).json(request);
    } catch (error) { next(error); }
  };

  listMyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await prisma.privacyRequest.findMany({ where: { customerId: req.user!.customerId }, orderBy: { createdAt: 'desc' } }));
    } catch (error) { next(error); }
  };

  listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status ? z.nativeEnum(PrivacyRequestStatus).parse(req.query.status) : undefined;
      res.json(await prisma.privacyRequest.findMany({ where: { status }, include: { customer: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }));
    } catch (error) { next(error); }
  };

  updateRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = requestUpdateSchema.parse(req.body);
      const completed = input.status === PrivacyRequestStatus.COMPLETED || input.status === PrivacyRequestStatus.REJECTED;
      const updated = await prisma.privacyRequest.update({ where: { id: req.params.id }, data: {
        status: input.status, response: input.response, reviewedById: req.admin!.adminId,
        identityVerifiedAt: input.identityVerified ? new Date() : undefined,
        completedAt: completed ? new Date() : null,
      } });
      res.json(updated);
    } catch (error) { next(error); }
  };

  listIncidents = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await prisma.securityIncident.findMany({ orderBy: { detectedAt: 'desc' } })); } catch (error) { next(error); }
  };

  createIncident = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = incidentSchema.parse(req.body);
      const incident = await prisma.securityIncident.create({ data: { ...input, reportedById: req.admin!.adminId } });
      res.status(201).json(incident);
    } catch (error) { next(error); }
  };

  updateIncident = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = incidentUpdateSchema.parse(req.body);
      const incident = await prisma.securityIncident.update({ where: { id: req.params.id }, data: {
        ...input,
        closedAt: input.status === SecurityIncidentStatus.CLOSED ? new Date() : undefined,
      } });
      res.json(incident);
    } catch (error) { next(error); }
  };
}
