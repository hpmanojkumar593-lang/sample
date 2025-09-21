// components/BrowsingHistory.js
import React, { useMemo, useCallback } from 'react';

const BrowsingHistory = ({ history, products, onClearHistory }) => {
  // Get full product details for browsed items
  const historyProducts = useMemo(() => {
    return history
      .map(productId => products.find(p => p.id === productId))
      .filter(Boolean) // Remove any undefined products
      .reverse(); // Show most recent first
  }, [history, products]);

  // Calculate browsing insights
  const browsingInsights = useMemo(() => {
    if (historyProducts.length === 0) return null;

    const categories = historyProducts.map(p => p.category);
    const prices = historyProducts.map(p => p.price);
    const brands = historyProducts.map(p => p.brand);
    
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const mostViewedCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      totalViewed: historyProducts.length,
      avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      mostViewedCategory: mostViewedCategory ? mostViewedCategory[0] : 'None',
      uniqueCategories: [...new Set(categories)].length,
      uniqueBrands: [...new Set(brands)].length,
      topBrands: [...new Set(brands)].slice(0, 3)
    };
  }, [historyProducts]);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear your browsing history? This action cannot be undone.')) {
      onClearHistory();
    }
  }, [onClearHistory]);

  // Empty state
  if (history.length === 0) {
    return (
      <div className="history-container empty">
        <div className="history-header">
          <h3>Your Browsing History</h3>
        </div>
        
        <div className="empty-history">
          <div className="empty-state">
            <div className="empty-icon">👀</div>
            <h4>No products viewed yet</h4>
            <p>
              Start exploring our product catalog! Click on any product that interests you 
              to build your browsing history.
            </p>
            <p>
              Your browsing history helps our AI understand your preferences and provide 
              more personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-content">
          <h3>Your Browsing History</h3>
          <div className="history-actions">
            <span className="history-count">{history.length} items viewed</span>
            <button 
              onClick={handleClearHistory}
              className="clear-history-btn"
              type="button"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>

      {/* Browsing Insights */}
      {browsingInsights && (
        <div className="browsing-insights">
          <h4>Your Browsing Insights</h4>
          <div className="insights-grid">
            <div className="insight-item">
              <span className="insight-label">Most Viewed Category</span>
              <span className="insight-value">{browsingInsights.mostViewedCategory}</span>
            </div>
            <div className="insight-item">
              <span className="insight-label">Average Price Viewed</span>
              <span className="insight-value">${browsingInsights.avgPrice}</span>
            </div>
            <div className="insight-item">
              <span className="insight-label">Price Range</span>
              <span className="insight-value">
                ${browsingInsights.priceRange.min} - ${browsingInsights.priceRange.max}
              </span>
            </div>
            <div className="insight-item">
              <span className="insight-label">Categories Explored</span>
              <span className="insight-value">{browsingInsights.uniqueCategories}</span>
            </div>
          </div>
          
          {browsingInsights.topBrands.length > 0 && (
            <div className="top-brands">
              <span className="brands-label">Brands you've viewed:</span>
              <div className="brands-list">
                {browsingInsights.topBrands.map(brand => (
                  <span key={brand} className="brand-tag">{brand}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browsing History List */}
      <div className="history-list">
        <div className="history-items">
          {historyProducts.map((product, index) => (
            <div key={`${product.id}-${index}`} className="history-item">
              <div className="item-content">
                <div className="item-main">
                  <div className="item-header">
                    <h4 className="item-title">{product.name}</h4>
                    <div className="item-price">${product.price}</div>
                  </div>
                  
                  <div className="item-meta">
                    <span className="item-category">{product.category}</span>
                    <span className="item-separator">•</span>
                    <span className="item-brand">{product.brand}</span>
                    <span className="item-separator">•</span>
                    <div className="item-rating">
                      <span className="rating-stars">
                        {'★'.repeat(Math.floor(product.rating || 0))}
                        {'☆'.repeat(5 - Math.floor(product.rating || 0))}
                      </span>
                      <span className="rating-value">({product.rating})</span>
                    </div>
                  </div>
                  
                  <p className="item-description">
                    {product.description.length > 150 
                      ? `${product.description.substring(0, 150)}...`
                      : product.description
                    }
                  </p>
                </div>
                
                <div className="item-details">
                  {product.features && product.features.length > 0 && (
                    <div className="item-features">
                      <strong>Key Features:</strong>
                      <ul className="features-list">
                        {product.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {product.tags && product.tags.length > 0 && (
                    <div className="item-tags">
                      {product.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className="item-footer">
                    <div className="inventory-info">
                      {product.inventory > 10 ? (
                        <span className="in-stock">In Stock</span>
                      ) : product.inventory > 0 ? (
                        <span className="low-stock">Only {product.inventory} left</span>
                      ) : (
                        <span className="out-of-stock">Out of Stock</span>
                      )}
                    </div>
                    
                    <div className="view-order">
                      <span className="view-number">#{historyProducts.length - index}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History Actions */}
      <div className="history-footer">
        <div className="footer-content">
          <p className="footer-text">
            Your browsing history helps us understand your preferences for better AI recommendations.
          </p>
          <div className="footer-actions">
            <button 
              onClick={handleClearHistory}
              className="clear-history-btn secondary"
              type="button"
            >
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsingHistory;