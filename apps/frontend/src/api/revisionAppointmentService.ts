import apiClient from './apiClient';

export type RevisionAppointmentStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RevisionAppointment {
  id: string;
  customerId: string;
  vehicleId: string;
  status: RevisionAppointmentStatus;
  preferredDate: string;
  scheduledAt: string | null;
  notes: string | null;
  adminNotes: string | null;
  cancellationReason: string | null;
  assignedMechanicId: string | null;
  mechanicName: string | null;
  revisionId: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    customerId: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color?: string | null;
    mileage?: number | null;
    chassisNumber?: string | null;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf?: string | null;
  };
  assignedMechanic?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  } | null;
  revision?: {
    id: string;
    status: string;
    date: string;
    completedAt: string | null;
  } | null;
}

interface PaginatedAppointmentsResponse {
  data: RevisionAppointment[];
  meta?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

class RevisionAppointmentService {
  async getCustomerAppointments(params?: {
    page?: number;
    limit?: number;
    vehicleId?: string;
    status?: RevisionAppointmentStatus;
  }): Promise<PaginatedAppointmentsResponse> {
    const response = await apiClient.get('/customer-revisions/appointments', { params });
    return response.data;
  }

  async createCustomerAppointment(data: {
    vehicleId: string;
    preferredDate: string;
    notes?: string;
  }): Promise<RevisionAppointment> {
    const response = await apiClient.post('/customer-revisions/appointments', data);
    return response.data.data || response.data;
  }

  async cancelCustomerAppointment(id: string, reason?: string): Promise<RevisionAppointment> {
    const response = await apiClient.patch(`/customer-revisions/appointments/${id}/cancel`, {
      reason,
    });
    return response.data.data || response.data;
  }

  async getAdminAppointments(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    vehicleId?: string;
    assignedMechanicId?: string;
    status?: RevisionAppointmentStatus;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedAppointmentsResponse> {
    const response = await apiClient.get('/admin/revision-appointments', { params });
    return {
      data: response.data.data || [],
      meta: response.data.meta,
    };
  }

  async scheduleAppointment(
    id: string,
    data: {
      scheduledAt: string;
      assignedMechanicId: string;
      adminNotes?: string;
    }
  ): Promise<RevisionAppointment> {
    const response = await apiClient.put(`/admin/revision-appointments/${id}/schedule`, data);
    return response.data.data || response.data;
  }

  async startAppointment(id: string): Promise<RevisionAppointment> {
    const response = await apiClient.patch(`/admin/revision-appointments/${id}/start`);
    return response.data.data || response.data;
  }

  async cancelAdminAppointment(id: string, reason?: string): Promise<RevisionAppointment> {
    const response = await apiClient.patch(`/admin/revision-appointments/${id}/cancel`, {
      reason,
    });
    return response.data.data || response.data;
  }
}

export default new RevisionAppointmentService();
