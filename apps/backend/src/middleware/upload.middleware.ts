import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Request } from 'express';

// Configurar diretório de uploads
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PRODUCTS_DIR = path.join(UPLOAD_DIR, 'products');
const LANDING_PAGE_DIR = path.join(UPLOAD_DIR, 'landing-page');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

// Garantir que os diretórios existam
[UPLOAD_DIR, PRODUCTS_DIR, LANDING_PAGE_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.'));
  }
};

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Máximo 10 arquivos
  }
});

// Interface para opções de processamento
interface ProcessImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

// Processar e otimizar imagem
export async function processImage(
  inputPath: string,
  outputPath: string,
  options: ProcessImageOptions = {}
): Promise<void> {
  const {
    width,
    height,
    quality = 85,
    format = 'jpeg'
  } = options;

  let pipeline = sharp(inputPath);

  // Redimensionar se especificado
  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Converter e otimizar
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
  }

  await pipeline.toFile(outputPath);
}

// Processar imagem de produto em múltiplos tamanhos
export async function processProductImage(
  inputPath: string,
  productId: string
): Promise<{ thumbnail: string; medium: string; full: string }> {
  const fileId = uuidv4();
  const baseFilename = `${productId}-${fileId}`;

  const sizes = {
    thumbnail: { width: 200, height: 200, suffix: 'thumb' },
    medium: { width: 600, height: 600, suffix: 'medium' },
    full: { width: 1200, height: 1200, suffix: 'full' }
  };

  const results: any = {};

  for (const [key, config] of Object.entries(sizes)) {
    const filename = `${baseFilename}-${config.suffix}.jpg`;
    const outputPath = path.join(PRODUCTS_DIR, filename);

    await processImage(inputPath, outputPath, {
      width: config.width,
      height: config.height,
      quality: 85,
      format: 'jpeg'
    });

    results[key] = `/uploads/products/${filename}`;
  }

  // Remover arquivo temporário
  fs.unlinkSync(inputPath);

  return results;
}

// Deletar imagens de produto
export async function deleteProductImages(imageUrls: string[]): Promise<void> {
  for (const url of imageUrls) {
    try {
      // Extrair caminho do arquivo da URL
      const filename = path.basename(url);
      const filePath = path.join(PRODUCTS_DIR, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Erro ao deletar imagem ${url}:`, error);
    }
  }
}

// Limpar arquivos temporários antigos (mais de 1 hora)
export function cleanupTempFiles(): void {
  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hora

  files.forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
    }
  });
}

// Executar limpeza a cada hora
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// ============================================================================
// LANDING PAGE IMAGE PROCESSING
// ============================================================================

/**
 * Processar imagem da landing page (hero, header, footer)
 * Otimiza e salva em /uploads/landing-page/
 */
export async function processLandingPageImage(
  inputPath: string,
  category: string // 'hero', 'header', 'footer', 'logo', etc.
): Promise<string> {
  const fileId = uuidv4();
  const filename = `${category}-${fileId}.jpg`;
  const outputPath = path.join(LANDING_PAGE_DIR, filename);

  // Processar imagem com qualidade alta para landing page
  await processImage(inputPath, outputPath, {
    width: 1920,
    height: 1080,
    quality: 90,
    format: 'jpeg'
  });

  // Remover arquivo temporário
  if (fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  return `/uploads/landing-page/${filename}`;
}

/**
 * Deletar imagens da landing page
 */
export async function deleteLandingPageImages(imageUrls: string[]): Promise<void> {
  for (const url of imageUrls) {
    try {
      // Apenas deletar se for uma URL local (/uploads/landing-page/...)
      if (!url.startsWith('/uploads/landing-page/')) {
        continue;
      }

      // Extrair caminho do arquivo da URL
      const filename = path.basename(url);
      const filePath = path.join(LANDING_PAGE_DIR, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Upload] Imagem deletada: ${filename}`);
      }
    } catch (error) {
      console.error(`[Upload] Erro ao deletar imagem ${url}:`, error);
    }
  }
}

/**
 * Extrair URLs de imagens de um objeto de configuração
 * Busca recursivamente por propriedades 'url' ou que contenham 'Image'
 */
export function extractImageUrls(config: any): string[] {
  const urls: string[] = [];

  function extract(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    // Se é array, processar cada item
    if (Array.isArray(obj)) {
      obj.forEach(item => extract(item));
      return;
    }

    // Se é objeto, buscar propriedades de imagem
    for (const [key, value] of Object.entries(obj)) {
      // Propriedade 'url' direta
      if (key === 'url' && typeof value === 'string' && value.startsWith('/uploads/landing-page/')) {
        urls.push(value);
      }
      // Propriedades que contenham 'Image' ou 'image' e sejam objetos com 'url'
      else if ((key.toLowerCase().includes('image') || key === 'logo') && typeof value === 'object' && value !== null) {
        extract(value);
      }
      // Recursivamente buscar em objetos aninhados
      else if (typeof value === 'object' && value !== null) {
        extract(value);
      }
    }
  }

  extract(config);
  return [...new Set(urls)]; // Remover duplicatas
}
