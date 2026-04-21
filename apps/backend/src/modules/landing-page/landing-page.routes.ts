/**
 * Landing Page Routes - Rotas para configuração da landing page
 * Padrão Ferraco: JSON-based configuration com histórico completo
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { AdminAuthMiddleware } from '../../middlewares/admin-auth.middleware.js';
import { upload, processLandingPageImage, deleteLandingPageImages, extractImageUrls } from '../../middleware/upload.middleware.js';

const router = Router();
const authenticate = AdminAuthMiddleware.authenticate;

// Helper: Log de alterações
const logChange = (action: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[LandingPage] ${timestamp} - ${action}`, details || '');
};

// ============================================================================
// UPLOAD DE IMAGENS
// ============================================================================

/**
 * POST /api/landing-page/upload
 * Upload de imagem para landing page (requer autenticação)
 */
router.post('/upload', authenticate, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem enviada',
      });
    }

    // Extrair categoria do body (hero, header, footer, logo, etc.)
    const category = req.body.category || 'general';

    logChange('📤 Upload de imagem', {
      category,
      filename: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimetype: req.file.mimetype,
    });

    // Processar e otimizar imagem
    const imageUrl = await processLandingPageImage(req.file.path, category);

    logChange('✅ Upload concluído', { imageUrl });

    return res.json({
      success: true,
      data: {
        url: imageUrl,
      },
      message: 'Imagem enviada com sucesso',
    });
  } catch (error: any) {
    logChange('❌ Erro no upload', { error: error.message });

    console.error('Erro ao fazer upload de imagem:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao fazer upload da imagem',
    });
  }
});

// ============================================================================
// CONFIGURAÇÃO DA LANDING PAGE
// ============================================================================

/**
 * GET /api/landing-page/config
 * Buscar configuração da landing page (pública - sem auth)
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // Buscar a primeira (e única) configuração de landing page
    const config = await prisma.landingPageConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuração da landing page não encontrada',
      });
    }

    // Parsear JSONs
    const parsedConfig = {
      id: config.id,
      header: JSON.parse(config.header),
      hero: JSON.parse(config.hero),
      marquee: JSON.parse(config.marquee),
      about: JSON.parse(config.about),
      products: JSON.parse(config.products),
      services: JSON.parse(config.services),
      contactPage: config.contactPage ? JSON.parse(config.contactPage) : undefined,
      aboutPage: config.aboutPage ? JSON.parse(config.aboutPage) : undefined,
      contact: JSON.parse(config.contact),
      footer: JSON.parse(config.footer),
      updatedAt: config.updatedAt,
    };

    return res.json({
      success: true,
      data: parsedConfig,
    });
  } catch (error: any) {
    console.error('Erro ao buscar configuração da landing page:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar configuração',
    });
  }
});

/**
 * PUT /api/landing-page/config
 * Atualizar configuração da landing page (requer autenticação)
 */
router.put('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const { header, hero, marquee, about, products, services, contactPage, aboutPage, contact, footer } = req.body;

    // Validar que ao menos um campo foi enviado
    if (!header && !hero && !marquee && !about && !products && !services && !contactPage && !aboutPage && !contact && !footer) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar foi fornecido',
      });
    }

    // Buscar config existente
    const existingConfig = await prisma.landingPageConfig.findFirst();

    // ========================================================================
    // LIMPEZA AUTOMÁTICA DE IMAGENS ANTIGAS
    // ========================================================================
    if (existingConfig) {
      try {
        // Extrair URLs antigas
        const oldConfig = {
          header: JSON.parse(existingConfig.header),
          hero: JSON.parse(existingConfig.hero),
          marquee: JSON.parse(existingConfig.marquee),
          about: JSON.parse(existingConfig.about),
          products: JSON.parse(existingConfig.products),
          services: JSON.parse(existingConfig.services),
          contactPage: existingConfig.contactPage ? JSON.parse(existingConfig.contactPage) : {},
          aboutPage: existingConfig.aboutPage ? JSON.parse(existingConfig.aboutPage) : {},
          contact: JSON.parse(existingConfig.contact),
          footer: JSON.parse(existingConfig.footer),
        };

        const oldUrls = extractImageUrls(oldConfig);

        // Extrair URLs novas
        const newConfig = { header, hero, marquee, about, products, services, contactPage, aboutPage, contact, footer };
        const newUrls = extractImageUrls(newConfig);

        // Identificar imagens que não são mais usadas
        const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));

        if (urlsToDelete.length > 0) {
          logChange('🗑️ Limpando imagens não utilizadas', {
            count: urlsToDelete.length,
            urls: urlsToDelete,
          });

          await deleteLandingPageImages(urlsToDelete);
        }
      } catch (error) {
        // Não falhar a atualização se a limpeza falhar
        console.error('[LandingPage] Erro ao limpar imagens antigas:', error);
      }
    }

    let config;

    if (existingConfig) {
      // Atualizar config existente
      const updateData: any = {};
      if (header) updateData.header = JSON.stringify(header);
      if (hero) updateData.hero = JSON.stringify(hero);
      if (marquee) updateData.marquee = JSON.stringify(marquee);
      if (about) updateData.about = JSON.stringify(about);
      if (products) updateData.products = JSON.stringify(products);
      if (services) updateData.services = JSON.stringify(services);
      if (contactPage) updateData.contactPage = JSON.stringify(contactPage);
      if (aboutPage) updateData.aboutPage = JSON.stringify(aboutPage);
      if (contact) updateData.contact = JSON.stringify(contact);
      if (footer) updateData.footer = JSON.stringify(footer);

      config = await prisma.landingPageConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
    } else {
      // Criar nova config
      config = await prisma.landingPageConfig.create({
        data: {
          header: JSON.stringify(header || {}),
          hero: JSON.stringify(hero || {}),
          marquee: JSON.stringify(marquee || {}),
          about: JSON.stringify(about || {}),
          products: JSON.stringify(products || {}),
          services: JSON.stringify(services || {}),
          contactPage: JSON.stringify(contactPage || {}),
          aboutPage: JSON.stringify(aboutPage || {}),
          contact: JSON.stringify(contact || {}),
          footer: JSON.stringify(footer || {}),
        },
      });
    }

    // Parsear JSONs para resposta
    const parsedConfig = {
      id: config.id,
      header: JSON.parse(config.header),
      hero: JSON.parse(config.hero),
      marquee: JSON.parse(config.marquee),
      about: JSON.parse(config.about),
      products: JSON.parse(config.products),
      services: JSON.parse(config.services),
      contactPage: config.contactPage ? JSON.parse(config.contactPage) : undefined,
      aboutPage: config.aboutPage ? JSON.parse(config.aboutPage) : undefined,
      contact: JSON.parse(config.contact),
      footer: JSON.parse(config.footer),
      updatedAt: config.updatedAt,
    };

    return res.json({
      success: true,
      data: parsedConfig,
      message: 'Configuração atualizada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configuração da landing page:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar configuração',
    });
  }
});

// ============================================================================
// ENDPOINTS DE HISTÓRICO
// ============================================================================

/**
 * POST /api/landing-page/config/history
 * Salvar versão no histórico (chamado pelo frontend após cada save)
 */
router.post('/config/history', authenticate, async (req: any, res: Response) => {
  try {
    const { config, changeType = 'manual_save' } = req.body;
    const userId = req.admin?.adminId;

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuração não fornecida',
      });
    }

    logChange('📜 Salvando no histórico', {
      changeType,
      userId,
      hasHeader: !!config.header,
      hasHero: !!config.hero,
    });

    // Buscar config principal para associar
    const mainConfig = await prisma.landingPageConfig.findFirst();

    const historyEntry = await prisma.landingPageConfigHistory.create({
      data: {
        configId: mainConfig?.id || null,
        header: JSON.stringify(config.header),
        hero: JSON.stringify(config.hero),
        marquee: JSON.stringify(config.marquee),
        about: JSON.stringify(config.about),
        products: JSON.stringify(config.products),
        services: JSON.stringify(config.services),
        contactPage: JSON.stringify(config.contactPage || {}),
        aboutPage: JSON.stringify(config.aboutPage || {}),
        contact: JSON.stringify(config.contact),
        footer: JSON.stringify(config.footer),
        changeType,
        changedByUserId: userId,
      },
    });

    logChange('✅ Histórico salvo', {
      historyId: historyEntry.id,
      changeType,
    });

    return res.json({
      success: true,
      data: {
        id: historyEntry.id,
        createdAt: historyEntry.createdAt,
      },
      message: 'Versão salva no histórico',
    });
  } catch (error: any) {
    logChange('❌ Erro ao salvar histórico', {
      error: error.message,
    });

    console.error('Erro ao salvar histórico:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao salvar histórico',
    });
  }
});

/**
 * GET /api/landing-page/config/history
 * Listar histórico de alterações (paginado)
 */
router.get('/config/history', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const changeType = req.query.changeType as string | undefined;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (changeType) {
      where.changeType = changeType;
    }

    logChange('📖 Buscando histórico', {
      page,
      limit,
      changeType: changeType || 'all',
    });

    const [history, total] = await Promise.all([
      prisma.landingPageConfigHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          changeType: true,
          createdAt: true,
          changedByUserId: true,
          changedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.landingPageConfigHistory.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logChange('❌ Erro ao buscar histórico', { error: error.message });

    console.error('Erro ao buscar histórico:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar histórico',
    });
  }
});

/**
 * GET /api/landing-page/config/history/:id
 * Buscar versão específica do histórico
 */
router.get('/config/history/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logChange('🔍 Buscando versão do histórico', { id });

    const historyEntry = await prisma.landingPageConfigHistory.findUnique({
      where: { id },
      include: {
        changedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Versão não encontrada no histórico',
      });
    }

    // Parsear JSONs
    const parsedConfig = {
      id: historyEntry.id,
      header: JSON.parse(historyEntry.header),
      hero: JSON.parse(historyEntry.hero),
      marquee: JSON.parse(historyEntry.marquee),
      about: JSON.parse(historyEntry.about),
      products: JSON.parse(historyEntry.products),
      services: JSON.parse(historyEntry.services),
      contactPage: historyEntry.contactPage ? JSON.parse(historyEntry.contactPage) : undefined,
      aboutPage: historyEntry.aboutPage ? JSON.parse(historyEntry.aboutPage) : undefined,
      contact: JSON.parse(historyEntry.contact),
      footer: JSON.parse(historyEntry.footer),
      changeType: historyEntry.changeType,
      createdAt: historyEntry.createdAt,
      changedBy: historyEntry.changedByUser,
    };

    return res.json({
      success: true,
      data: parsedConfig,
    });
  } catch (error: any) {
    logChange('❌ Erro ao buscar versão', {
      id: req.params.id,
      error: error.message,
    });

    console.error('Erro ao buscar versão:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar versão',
    });
  }
});

/**
 * POST /api/landing-page/config/restore/:id
 * Restaurar versão específica do histórico
 */
router.post('/config/restore/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.admin?.adminId;

    logChange('↩️ Restaurando versão do histórico', { id, userId });

    const historyEntry = await prisma.landingPageConfigHistory.findUnique({
      where: { id },
    });

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Versão não encontrada no histórico',
      });
    }

    // Buscar config existente
    const existingConfig = await prisma.landingPageConfig.findFirst();

    let restoredConfig;

    if (existingConfig) {
      // Atualizar config existente
      restoredConfig = await prisma.landingPageConfig.update({
        where: { id: existingConfig.id },
        data: {
          header: historyEntry.header,
          hero: historyEntry.hero,
          marquee: historyEntry.marquee,
          about: historyEntry.about,
          products: historyEntry.products,
          services: historyEntry.services,
          contactPage: historyEntry.contactPage,
          aboutPage: historyEntry.aboutPage,
          contact: historyEntry.contact,
          footer: historyEntry.footer,
        },
      });
    } else {
      // Criar nova config
      restoredConfig = await prisma.landingPageConfig.create({
        data: {
          header: historyEntry.header,
          hero: historyEntry.hero,
          marquee: historyEntry.marquee,
          about: historyEntry.about,
          products: historyEntry.products,
          services: historyEntry.services,
          contactPage: historyEntry.contactPage,
          aboutPage: historyEntry.aboutPage,
          contact: historyEntry.contact,
          footer: historyEntry.footer,
        },
      });
    }

    // Salvar nova entrada no histórico (tipo 'restore')
    await prisma.landingPageConfigHistory.create({
      data: {
        configId: restoredConfig.id,
        header: historyEntry.header,
        hero: historyEntry.hero,
        marquee: historyEntry.marquee,
        about: historyEntry.about,
        products: historyEntry.products,
        services: historyEntry.services,
        contactPage: historyEntry.contactPage,
        aboutPage: historyEntry.aboutPage,
        contact: historyEntry.contact,
        footer: historyEntry.footer,
        changeType: 'restore',
        changedByUserId: userId,
      },
    });

    logChange('✅ Versão restaurada com sucesso', {
      historyId: id,
      configId: restoredConfig.id,
    });

    // Parsear JSONs para resposta
    const parsedConfig = {
      id: restoredConfig.id,
      header: JSON.parse(restoredConfig.header),
      hero: JSON.parse(restoredConfig.hero),
      marquee: JSON.parse(restoredConfig.marquee),
      about: JSON.parse(restoredConfig.about),
      products: JSON.parse(restoredConfig.products),
      services: JSON.parse(restoredConfig.services),
      contactPage: restoredConfig.contactPage ? JSON.parse(restoredConfig.contactPage) : undefined,
      aboutPage: restoredConfig.aboutPage ? JSON.parse(restoredConfig.aboutPage) : undefined,
      contact: JSON.parse(restoredConfig.contact),
      footer: JSON.parse(restoredConfig.footer),
      updatedAt: restoredConfig.updatedAt,
    };

    return res.json({
      success: true,
      data: parsedConfig,
      message: 'Configuração restaurada com sucesso',
    });
  } catch (error: any) {
    logChange('❌ Erro ao restaurar versão', {
      id: req.params.id,
      error: error.message,
    });

    console.error('Erro ao restaurar versão:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao restaurar versão',
    });
  }
});

/**
 * DELETE /api/landing-page/config/history/:id
 * Deletar entrada do histórico
 */
router.delete('/config/history/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logChange('🗑️ Deletando entrada do histórico', { id });

    await prisma.landingPageConfigHistory.delete({
      where: { id },
    });

    logChange('✅ Entrada do histórico deletada', { id });

    return res.json({
      success: true,
      message: 'Entrada do histórico deletada com sucesso',
    });
  } catch (error: any) {
    logChange('❌ Erro ao deletar entrada do histórico', {
      id: req.params.id,
      error: error.message,
    });

    console.error('Erro ao deletar entrada do histórico:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao deletar entrada do histórico',
    });
  }
});

export default router;
