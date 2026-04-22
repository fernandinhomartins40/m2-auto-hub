/**
 * FIPE API Service
 * API gratuita: 500 requisições/dia sem token
 * Documentação: https://deividfortuna.github.io/fipe/v2/
 */

const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  name: string;
}

export interface FipeYear {
  code: string;
  name: string; // Ex: "2020-1" ou "2020 Gasolina"
}

export interface FipeVehicleDetail {
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  price: string;
  referenceMonth: string;
}

type VehicleType = 'cars' | 'motorcycles' | 'trucks';

class FipeService {
  private cache: Map<string, any> = new Map();
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Buscar marcas de carros
   */
  async getBrands(vehicleType: VehicleType = 'cars'): Promise<FipeBrand[]> {
    const cacheKey = `brands-${vehicleType}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands`);
      if (!response.ok) throw new Error('Erro ao buscar marcas');

      const data = await response.json();
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      throw error;
    }
  }

  /**
   * Buscar modelos de uma marca
   */
  async getModels(brandCode: string, vehicleType: VehicleType = 'cars'): Promise<FipeModel[]> {
    const cacheKey = `models-${vehicleType}-${brandCode}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands/${brandCode}/models`);
      if (!response.ok) throw new Error('Erro ao buscar modelos');

      const data = await response.json();
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar modelos FIPE:', error);
      throw error;
    }
  }

  /**
   * Buscar anos de um modelo
   */
  async getYears(
    brandCode: string,
    modelCode: string,
    vehicleType: VehicleType = 'cars'
  ): Promise<FipeYear[]> {
    const cacheKey = `years-${vehicleType}-${brandCode}-${modelCode}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${FIPE_BASE_URL}/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`
      );
      if (!response.ok) throw new Error('Erro ao buscar anos');

      const data = await response.json();
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar anos FIPE:', error);
      throw error;
    }
  }

  /**
   * Buscar detalhes completos do veículo
   */
  async getVehicleDetails(
    brandCode: string,
    modelCode: string,
    yearCode: string,
    vehicleType: VehicleType = 'cars'
  ): Promise<FipeVehicleDetail> {
    try {
      const response = await fetch(
        `${FIPE_BASE_URL}/${vehicleType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
      );
      if (!response.ok) throw new Error('Erro ao buscar detalhes do veículo');

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar detalhes FIPE:', error);
      throw error;
    }
  }

  /**
   * Extrair ano do código (ex: "2020-1" -> 2020)
   */
  extractYear(yearCode: string): number {
    const match = yearCode.match(/^(\d{4})/);
    return match ? parseInt(match[1]) : new Date().getFullYear();
  }

  /**
   * Limpar cache (útil para testes)
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Métodos privados de cache

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

export default new FipeService();
