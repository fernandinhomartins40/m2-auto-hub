import apiClient from './apiClient';

export interface CreateRevisionRequest {
  customerId: string;
  vehicleId: string;
  date: string;
  mileage?: number;
  checklistItems: any[];
  generalNotes?: string;
  recommendations?: string;
}

export interface UpdateRevisionRequest {
  mileage?: number;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklistItems?: any[];
  generalNotes?: string;
  recommendations?: string;
  assignedMechanicId?: string;
  mechanicName?: string;
  mechanicNotes?: string;
}

export interface RevisionResponse {
  id: string;
  customerId: string;
  vehicleId: string;
  date: string;
  mileage: number | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklistItems: any;
  generalNotes: string | null;
  recommendations: string | null;
  assignedMechanicId: string | null;
  mechanicName: string | null;
  mechanicNotes: string | null;
  assignedAt: string | null;
  transferHistory: any[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ExportRevisionPdfPayload {
  html: string;
  filename?: string;
}

class RevisionService {
  /**
   * Create a new revision (Admin)
   */
  async createRevision(data: CreateRevisionRequest): Promise<RevisionResponse> {
    const response = await apiClient.post('/admin/revisions', data);
    return response.data.data || response.data;
  }

  /**
   * Update revision (Admin)
   */
  async updateRevision(id: string, data: UpdateRevisionRequest): Promise<RevisionResponse> {
    const response = await apiClient.put(`/admin/revisions/${id}`, data);
    return response.data.data || response.data;
  }

  /**
   * Update revision checklist partially (Admin)
   */
  async updateRevisionChecklistPartial(id: string, checklistItems: any[]): Promise<RevisionResponse> {
    const response = await apiClient.patch(`/admin/revisions/${id}/checklist`, { checklistItems });
    return response.data.data || response.data;
  }

  /**
   * Start revision (Admin)
   */
  async startRevision(id: string): Promise<RevisionResponse> {
    const response = await apiClient.patch(`/admin/revisions/${id}/start`);
    return response.data.data || response.data;
  }

  /**
   * Complete revision (Admin)
   */
  async completeRevision(id: string): Promise<RevisionResponse> {
    const response = await apiClient.patch(`/admin/revisions/${id}/complete`);
    return response.data.data || response.data;
  }

  /**
   * Cancel revision (Admin)
   */
  async cancelRevision(id: string): Promise<RevisionResponse> {
    const response = await apiClient.patch(`/admin/revisions/${id}/cancel`);
    return response.data.data || response.data;
  }

  /**
   * Get revision by ID (Admin)
   */
  async getRevisionById(id: string): Promise<RevisionResponse> {
    const response = await apiClient.get(`/admin/revisions/${id}`);
    return response.data.data || response.data;
  }

  /**
   * Export revision PDF (Admin)
   */
  async exportRevisionPdf(id: string, payload: ExportRevisionPdfPayload): Promise<void> {
    const response = await apiClient.post(`/admin/revisions/${id}/export-pdf`, payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || `revisao-${id.slice(0, 8)}.pdf`;
    const matchedFilename = contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1];
    const filename = matchedFilename || fallbackFilename;

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export revision PDF (Customer)
   */
  async exportCustomerRevisionPdf(id: string, payload: ExportRevisionPdfPayload): Promise<void> {
    const response = await apiClient.post(`/customer-revisions/${id}/export-pdf`, payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || `revisao-${id.slice(0, 8)}.pdf`;
    const matchedFilename = contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1];
    const filename = matchedFilename || fallbackFilename;

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Delete revision (Admin)
   */
  async deleteRevision(id: string): Promise<void> {
    await apiClient.delete(`/admin/revisions/${id}`);
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Get all revisions for authenticated customer
   */
  async getCustomerRevisions(params?: {
    page?: number;
    limit?: number;
    vehicleId?: string;
    status?: string;
  }): Promise<{ data: RevisionResponse[]; meta?: any }> {
    const response = await apiClient.get('/customer-revisions', { params });
    // Esta já retorna o formato correto { data: [...], meta: {...} }
    return response.data;
  }

  /**
   * Get specific revision by ID for authenticated customer
   */
  async getCustomerRevisionById(id: string): Promise<RevisionResponse> {
    const response = await apiClient.get(`/customer-revisions/${id}`);
    return response.data.data || response.data;
  }

  /**
   * Get revisions for specific vehicle of authenticated customer
   */
  async getCustomerRevisionsByVehicle(vehicleId: string): Promise<{ data: RevisionResponse[]; meta?: any }> {
    const response = await apiClient.get(`/customer-revisions/vehicle/${vehicleId}`);
    // Esta já retorna o formato correto { data: [...], meta: {...} }
    return response.data;
  }

  /**
   * Get upcoming maintenance reminders for authenticated customer
   */
  async getUpcomingReminders(): Promise<any[]> {
    const response = await apiClient.get('/customer-revisions/reminders/upcoming');
    return response.data.data || response.data;
  }

  // ==================== MECHANIC MANAGEMENT ====================

  /**
   * Assign mechanic to revision (Admin)
   */
  async assignMechanic(revisionId: string, mechanicId: string): Promise<RevisionResponse> {
    const response = await apiClient.post(`/revisions/${revisionId}/assign-mechanic`, {
      mechanicId
    });
    return response.data.data;
  }

  /**
   * Transfer revision to another mechanic (Admin)
   */
  async transferMechanic(
    revisionId: string,
    newMechanicId: string,
    reason?: string
  ): Promise<RevisionResponse> {
    const response = await apiClient.post(`/revisions/${revisionId}/transfer-mechanic`, {
      newMechanicId,
      reason
    });
    return response.data.data;
  }

  /**
   * Unassign mechanic from revision (Admin)
   */
  async unassignMechanic(revisionId: string): Promise<RevisionResponse> {
    const response = await apiClient.delete(`/revisions/${revisionId}/unassign-mechanic`);
    return response.data.data;
  }

  /**
   * Get revisions by mechanic (Admin)
   */
  async getRevisionsByMechanic(
    mechanicId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<{ data: RevisionResponse[]; meta: any }> {
    const response = await apiClient.get(`/revisions/mechanic/${mechanicId}`, { params });
    // Esta já retorna o formato correto { data: [...], meta: {...} }
    return response.data;
  }

  /**
   * Get all mechanics workload (Admin)
   */
  async getMechanicsWorkload(): Promise<any[]> {
    const response = await apiClient.get('/revisions/mechanics/workload');
    return response.data.data;
  }
}

export default new RevisionService();
