import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service.js';
import { createProductSchema } from './dto/create-product.dto.js';
import { updateProductSchema } from './dto/update-product.dto.js';
import { queryProductsSchema } from './dto/query-products.dto.js';
import { processProductImage } from '../../middleware/upload.middleware.js';
import { z } from 'zod';

export class ProductsController {
  private productsService: ProductsService;

  constructor() {
    this.productsService = new ProductsService();
  }

  /**
   * GET /products
   */
  getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = queryProductsSchema.parse(req.query);
      const result = await this.productsService.getProducts(query);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/:id
   */
  getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.productsService.getProductById(req.params.id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/slug/:slug
   */
  getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.productsService.getProductBySlug(req.params.slug);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/sku/:sku
   */
  getProductBySku = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.productsService.getProductBySku(req.params.sku);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/category/:category
   */
  getProductsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const products = await this.productsService.getProductsByCategory(req.params.category, limit);

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/categories/list
   */
  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.productsService.getCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/categories
   */
  getManagedCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.productsService.getManagedCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /products/categories
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name: z.string().min(2, 'Category name must be at least 2 characters').max(80).trim(),
      });

      const { name } = schema.parse(req.body);
      const category = await this.productsService.createCategory(name);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /products/categories/:id
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name: z.string().min(2, 'Category name must be at least 2 characters').max(80).trim(),
      });

      const { name } = schema.parse(req.body);
      const category = await this.productsService.updateCategory(req.params.id, name);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/stock/low
   */
  getLowStockProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const products = await this.productsService.getLowStockProducts();

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /products
   */
  createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Processar dados do formulário
      let productData = { ...req.body };

      // Parse de campos JSON se necessário
      if (typeof productData.specifications === 'string') {
        productData.specifications = JSON.parse(productData.specifications);
      }
      if (typeof productData.vehicle_compatibility === 'string') {
        productData.vehicle_compatibility = JSON.parse(productData.vehicle_compatibility);
      }

      // Converter campos numéricos (vêm como string do FormData)
      if (productData.costPrice) productData.costPrice = Number(productData.costPrice);
      if (productData.salePrice) productData.salePrice = Number(productData.salePrice);
      if (productData.promoPrice) productData.promoPrice = Number(productData.promoPrice);
      if (productData.stock) productData.stock = Number(productData.stock);
      if (productData.minStock) productData.minStock = Number(productData.minStock);

      // Processar imagens se houver
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        const imageUrls: string[] = [];

        // Criar produto temporariamente para ter ID
        const tempProduct = await this.productsService.createProduct({
          ...productData,
          images: [],
          image_url: ''
        });

        // Processar cada imagem
        for (const file of files) {
          const processedImages = await processProductImage(file.path, tempProduct.id);
          imageUrls.push(processedImages.full);
        }

        // Atualizar produto com imagens
        const product = await this.productsService.updateProduct(tempProduct.id, {
          images: imageUrls
        } as any);

        res.status(201).json({
          success: true,
          data: product,
        });
      } else {
        // Sem imagens, criar produto normalmente
        const dto = createProductSchema.parse(productData);
        const product = await this.productsService.createProduct(dto);

        res.status(201).json({
          success: true,
          data: product,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /products/:id
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Processar dados do formulário
      let productData = { ...req.body };

      // Parse de campos JSON se necessário
      if (typeof productData.specifications === 'string') {
        productData.specifications = JSON.parse(productData.specifications);
      }
      if (typeof productData.vehicle_compatibility === 'string') {
        productData.vehicle_compatibility = JSON.parse(productData.vehicle_compatibility);
      }
      if (typeof productData.existingImages === 'string') {
        productData.existingImages = JSON.parse(productData.existingImages);
      }

      // Converter campos numéricos (vêm como string do FormData)
      if (productData.costPrice) productData.costPrice = Number(productData.costPrice);
      if (productData.salePrice) productData.salePrice = Number(productData.salePrice);
      if (productData.promoPrice) productData.promoPrice = Number(productData.promoPrice);
      if (productData.stock !== undefined) productData.stock = Number(productData.stock);
      if (productData.minStock) productData.minStock = Number(productData.minStock);

      // Processar imagens
      const files = req.files as Express.Multer.File[] | undefined;
      const existingImages = productData.existingImages || [];
      const newImageUrls: string[] = [];

      // Processar novas imagens se houver
      if (files && files.length > 0) {
        for (const file of files) {
          const processedImages = await processProductImage(file.path, req.params.id);
          newImageUrls.push(processedImages.full);
        }
      }

      // Mesclar imagens existentes com novas
      if (newImageUrls.length > 0 || existingImages.length > 0) {
        productData.images = [...existingImages, ...newImageUrls];
      }

      // Remover campo auxiliar
      delete productData.existingImages;

      const dto = updateProductSchema.parse(productData) as any;
      const product = await this.productsService.updateProduct(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /products/:id
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.productsService.deleteProduct(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /products/:id/stock
   */
  updateStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        quantity: z.number().int('Quantity must be an integer'),
      });

      const { quantity } = schema.parse(req.body);
      const product = await this.productsService.updateStock(req.params.id, quantity);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /products/offers/active
   */
  getActiveOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        type: z.enum(['DIA', 'SEMANA', 'MES']).optional(),
      });

      const { type } = schema.parse(req.query);
      const offers = await this.productsService.getActiveOffers(type);

      res.status(200).json({
        success: true,
        data: offers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /products/bulk
   * Get multiple products by IDs
   */
  getProductsByIds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        productIds: z.array(z.string().uuid()).min(1).max(100),
      });

      const { productIds } = schema.parse(req.body);
      const products = await this.productsService.getProductsByIds(productIds);

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };
}
