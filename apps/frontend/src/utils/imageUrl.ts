// Utility function to get the correct image URL
// In production, images are served from the root (same origin)
// In development, we need to use the full API URL

export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return '/placeholder-product.jpg';
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

  if (!import.meta.env.DEV) {
    return normalizedPath;
  }

  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    return `${apiBaseUrl}${normalizedPath}`;
  }

  return normalizedPath;
};
