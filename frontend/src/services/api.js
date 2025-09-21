// services/api.js - FastAPI backend on port 5000
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Enhanced error handling
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Generic request handler with better error handling
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.error || `HTTP error ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    console.error('API request failed:', endpoint, error);
    throw new ApiError(
      'Network error - please check your connection',
      0,
      null
    );
  }
};

// Fetch all products from the API
export const fetchProducts = async () => {
  try {
    const response = await apiRequest('/products');
    // FastAPI returns direct array, but handle both formats
    return Array.isArray(response) ? response : response.products || response;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get product categories
export const fetchCategories = async () => {
  try {
    const response = await apiRequest('/categories');
    return response.categories || response;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Get specific product by ID
export const fetchProductById = async (productId) => {
  try {
    const response = await apiRequest(`/products/${productId}`);
    return response.product || response;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

// Search products
export const searchProducts = async (query, limit = 20) => {
  try {
    const response = await apiRequest(`/products/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    return response.products || response;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

// Filter products
export const filterProducts = async (filters) => {
  try {
    const response = await apiRequest('/products/filter', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    return response.products || response;
  } catch (error) {
    console.error('Error filtering products:', error);
    throw error;
  }
};

// Get recommendations based on user preferences and browsing history
export const getRecommendations = async (preferences, browsingHistory) => {
  try {
    const response = await apiRequest('/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        preferences: preferences,
        browsing_history: browsingHistory
      }),
    });
    
    return response;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    // Health check is at root level, not /api/health
    const response = await fetch('http://localhost:5000/health');
    return response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Export the ApiError class for use in components
export { ApiError };