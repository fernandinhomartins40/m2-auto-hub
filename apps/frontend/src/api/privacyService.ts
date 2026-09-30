import apiClient from './apiClient';

export type PrivacyRequestType = 'CONFIRMATION' | 'ACCESS' | 'CORRECTION' | 'PORTABILITY' | 'DELETION' | 'REVOCATION' | 'INFORMATION' | 'OPPOSITION';

export const privacyService = {
  recordConsent: (payload: { subjectKey: string; policyVersion: '2026-09-30'; choices: { analytics: boolean; marketing: boolean } }) =>
    apiClient.post('/privacy/consents', payload),
  createRequest: (payload: { type: PrivacyRequestType; details?: string }) =>
    apiClient.post('/privacy/me/requests', payload),
  listRequests: () => apiClient.get('/privacy/me/requests'),
  exportUrl: '/api/privacy/me/export',
};
