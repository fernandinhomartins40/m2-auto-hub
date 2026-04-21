import { Request, Response } from 'express';
import { FAQService } from './faq.service.js';
import { FAQHelpfulDto } from './dto/faq-helpful.dto.js';
import { validateDto } from '@shared/utils/validation.util.js';

const faqService = new FAQService();

export class FAQController {
  /**
   * GET /support/faq - Listar FAQ completo
   */
  async getFAQCategories(req: Request, res: Response) {
    const categories = await faqService.getFAQCategories();

    res.json({
      success: true,
      data: categories,
    });
  }

  /**
   * GET /support/faq/search - Buscar no FAQ
   */
  async searchFAQ(req: Request, res: Response) {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro de busca (q) é obrigatório',
      });
    }

    const results = await faqService.searchFAQ(q);

    return res.json({
      success: true,
      data: results,
    });
  }

  /**
   * POST /support/faq/:id/helpful - Marcar como útil/não útil
   */
  async markFAQHelpful(req: Request, res: Response) {
    const { id } = req.params;
    const dto = await validateDto(FAQHelpfulDto, req.body);

    const item = await faqService.markFAQHelpful(id, dto.isHelpful);

    res.json({
      success: true,
      data: item,
    });
  }

  /**
   * POST /support/faq/:id/view - Incrementar visualização
   */
  async incrementFAQView(req: Request, res: Response) {
    const { id } = req.params;

    const item = await faqService.incrementFAQView(id);

    res.json({
      success: true,
      data: item,
    });
  }
}
