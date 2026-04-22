import apiClient from './apiClient';

export interface UploadImagesResponse {
  success: boolean;
  data: {
    urls: string[];
  };
}

class UploadService {
  /**
   * Upload múltiplas imagens em base64
   */
  async uploadImages(images: string[]): Promise<string[]> {
    const response = await apiClient.post<UploadImagesResponse>('/uploads/images', {
      images,
    });
    return response.data.urls;
  }

  /**
   * Deleta múltiplas imagens
   */
  async deleteImages(urls: string[]): Promise<void> {
    await apiClient.delete('/uploads/images', {
      data: { urls },
    });
  }
}

export default new UploadService();
