import { useState, useEffect } from 'react';
import fipeService, { FipeBrand, FipeModel, FipeYear } from '../api/fipeService';

type VehicleType = 'cars' | 'motorcycles' | 'trucks';

export function useFipeData(vehicleType: VehicleType = 'cars') {
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [years, setYears] = useState<FipeYear[]>([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);

  // Carregar marcas ao montar
  useEffect(() => {
    loadBrands();
  }, [vehicleType]);

  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      const data = await fipeService.getBrands(vehicleType);
      setBrands(data);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadModels = async (brandCode: string) => {
    if (!brandCode) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    try {
      const data = await fipeService.getModels(brandCode, vehicleType);
      setModels(data);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadYears = async (brandCode: string, modelCode: string) => {
    if (!brandCode || !modelCode) {
      setYears([]);
      return;
    }

    setLoadingYears(true);
    try {
      const data = await fipeService.getYears(brandCode, modelCode, vehicleType);
      setYears(data);
    } catch (error) {
      console.error('Erro ao carregar anos:', error);
      setYears([]);
    } finally {
      setLoadingYears(false);
    }
  };

  const resetModels = () => {
    setModels([]);
  };

  const resetYears = () => {
    setYears([]);
  };

  return {
    brands,
    models,
    years,
    loadingBrands,
    loadingModels,
    loadingYears,
    loadModels,
    loadYears,
    resetModels,
    resetYears,
  };
}
