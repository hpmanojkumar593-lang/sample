// components/Catalog.js
import React, { useState, useMemo, useCallback } from 'react';

const Catalog = ({ products, onProductClick, browsingHistory }) => {
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: { min: 0, max: 1000 },
    sortBy: 'rating',
    searchQuery: ''
  });

  // Get unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return uniqueCategories.sort();
  }, [products]);

  // Filter and sort products based on current filters
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Price range filter
    filtered = filtered.filter(product => 
      product.price >= filters.priceRange.min && 
      product.price <= filters.priceRange.max
    );

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        product.brand.toLowerCase().includes(query)
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'inventory':
          return (b.inventory || 0) - (a.inventory || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handlePriceRangeChange = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: Math.max(0, parseInt(value) || 0)
      }
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      category: 'all',
      priceRange: { min: 0, max: 1000 },
      sortBy: 'rating',
      searchQuery: ''
    });
  }, []);

  // Check if product is in browsing history
  const isProductViewed = useCallback((productId) => {
    return browsingHistory.includes(productId);
  }, [browsingHistory]);

  // Product Card Component
  const ProductCard = React.memo(({ product }) => {
    const isViewed = isProductViewed(product.id);
    
    return (
      <div 
        className={`product-card ${isViewed ? 'viewed' : ''}`}
        onClick={() => onProductClick(product.id)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && onProductClick(product.id)}
      >
        <div className="product-header">
          <h3 className="product-name" title={product.name}>
            {product.name}
          </h3>
          <div className="product-price">${product.price}</div>
        </div>
        
        <div className="product-meta">
          <span className="product-category">{product.category}</span>
          <div className="product-rating">
            <span className="rating-stars">
              {'★'.repeat(Math.floor(product.rating || 0))}
              {'☆'.repeat(5 - Math.floor(product.rating || 0))}
            </span>
            <span className="rating-value">({product.rating || 'N/A'})</span>
          </div>
          <span className="product-brand">{product.brand}</span>
        </div>
        
        <p className="product-description" title={product.description}>
          {product.description.length > 120 
            ? `${product.description.substring(0, 120)}...` 
            : product.description
          }
        </p>
        
        {product.features && product.features.length > 0 && (
          <div className="product-features">
            <strong>Key Features:</strong>
            <ul>
              {product.features.slice(0, 2).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
              {product.features.length > 2 && (
                <li className="more-features">+{product.features.length - 2} more</li>
              )}
            </ul>
          </div>
        )}
        
        {product.tags && product.tags.length > 0 && (
          <div className="product-tags">
            {product.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
            {product.tags.length > 3 && (
              <span className="tag more-tags">+{product.tags.length - 3}</span>
            )}
          </div>
        )}
        
        <div className="product-footer">
          <div className="inventory-status">
            {product.inventory > 10 ? (
              <span className="in-stock">In Stock ({product.inventory})</span>
            ) : product.inventory > 0 ? (
              <span className="low-stock">Only {product.inventory} left!</span>
            ) : (
              <span className="out-of-stock">Out of Stock</span>
            )}
          </div>
          
          {isViewed && (
            <div className="viewed-indicator">
              <span className="viewed-badge">Recently Viewed</span>
            </div>
          )}
        </div>
      </div>
    );
  });

  if (!products || products.length === 0) {
    return (
      <div className="catalog-empty">
        <div className="empty-state">
          <h3>No products available</h3>
          <p>Please check back later for our product catalog.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-container">
      <div className="catalog-header">
        <div className="catalog-title">
          <h2>Product Catalog</h2>
          <p>Click on products to add them to your browsing history</p>
        </div>
      </div>

      <div className="catalog-filters">
        <div className="filter-row primary">
          <div className="filter-group search">
            <input
              type="text"
              placeholder="Search products, brands, or features..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="search-input"
              aria-label="Search products"
            />
          </div>
          
          <button 
            onClick={resetFilters}
            className="reset-filters-btn"
            disabled={filters.category === 'all' && filters.searchQuery === '' && 
                     filters.priceRange.min === 0 && filters.priceRange.max === 1000 &&
                     filters.sortBy === 'rating'}
          >
            Reset Filters
          </button>
        </div>

        <div className="filter-row secondary">
          <div className="filter-group">
            <label htmlFor="category-select">Category:</label>
            <select
              id="category-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map(category => {
                const count = products.filter(p => p.category === category).length;
                return (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name A-Z</option>
              <option value="inventory">Most Available</option>
            </select>
          </div>

          <div className="filter-group price-range">
            <label>Price Range:</label>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange.min}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                className="price-input"
                min="0"
              />
              <span className="price-separator">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange.max}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                className="price-input"
                min={filters.priceRange.min}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="catalog-results">
        <div className="results-info">
          <span className="results-count">
            Showing {filteredProducts.length} of {products.length} products
          </span>
          {browsingHistory.length > 0 && (
            <span className="browsing-info">
              {browsingHistory.length} products in browsing history
            </span>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-content">
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms</p>
              <button onClick={resetFilters} className="reset-filters-btn primary">
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;