export class SupportConfigService {
  /**
   * Retorna configurações de suporte
   */
  getSupportConfig() {
    return {
      contacts: {
        whatsapp: {
          number: process.env.SUPPORT_WHATSAPP || '5511999999999',
          message: 'Olá! Preciso de ajuda. Podem me atender?',
        },
        email: process.env.SUPPORT_EMAIL || 'suporte@moriapecas.com.br',
        phone: process.env.SUPPORT_PHONE || '(11) 99999-9999',
      },
      businessHours: {
        weekdays: {
          label: 'Segunda a Sexta',
          hours: '8h às 18h',
          start: '08:00',
          end: '18:00',
        },
        saturday: {
          label: 'Sábados',
          hours: '8h às 14h',
          start: '08:00',
          end: '14:00',
        },
        sunday: {
          label: 'Domingos',
          hours: 'Fechado',
          start: null,
          end: null,
        },
      },
      sla: {
        responseTime: {
          urgent: '1 hora',
          high: '4 horas',
          medium: '24 horas',
          low: '48 horas',
        },
        resolutionTime: {
          urgent: '4 horas',
          high: '1 dia',
          medium: '3 dias',
          low: '5 dias',
        },
      },
      features: {
        attachments: true,
        maxAttachmentSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      },
    };
  }

  /**
   * Verifica se o suporte está disponível agora
   */
  isOnline(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Domingo, 6 = Sábado
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    // Domingo (0)
    if (day === 0) return false;

    // Sábado (6)
    if (day === 6) {
      return currentTime >= 8 * 60 && currentTime < 14 * 60; // 8h-14h
    }

    // Segunda a Sexta (1-5)
    return currentTime >= 8 * 60 && currentTime < 18 * 60; // 8h-18h
  }

  /**
   * Retorna o próximo horário disponível
   */
  getNextAvailableTime(): Date {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // Se é durante a semana e antes das 18h, retorna próximo dia útil às 8h
    if (day >= 1 && day <= 5 && hour < 18) {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    }

    // Se é sexta após 18h ou sábado após 14h, retorna segunda às 8h
    if ((day === 5 && hour >= 18) || (day === 6 && hour >= 14)) {
      const next = new Date(now);
      const daysUntilMonday = day === 5 ? 3 : 2;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(8, 0, 0, 0);
      return next;
    }

    // Se é domingo, retorna segunda às 8h
    if (day === 0) {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    }

    // Padrão: próximo dia útil às 8h
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next;
  }
}
