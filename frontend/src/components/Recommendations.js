// components/Recommendations.js
import React, { useMemo } from 'react';

const Recommendations = ({ recommendations, isLoading }) => {
  // Sort recommendations by confidence score
  const sortedRecommendations = useMemo(() => {
    if (!recommendations || !Array.isArray(recommendations)) return [];
    
    return [...recommendations].sort((a, b) => {
      const scoreA = a.confidence_score || 0;
      const scoreB = b.confidence_score || 0;
      return scoreB - scoreA;
    });
  }, [recommendations]);

  // Loading state
  if (isLoading) {
    return (
      <div className="recommendations-container loading">
        <div className="loading-content">
          <div className="loading-animation">
            <div className="loading-icon">🤖</div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h3>Generating AI Recommendations...</h3>
          <p>Our AI is analyzing your preferences and browsing history to find the perfect products for you.</p>
          <div className="loading-steps">
            <div className="step active">Analyzing your preferences</div>
            <div className="step active">Processing browsing history</div>
            <div className="step active">Finding matching products</div>
            <div className="step">Generating explanations</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="recommendations-container empty">
        <div className="empty-recommendations">
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No recommendations yet</h3>
            <div className="empty-content">
              <p>To get personalized AI recommendations:</p>
              <ul className="recommendation-tips">
                <li>Set your preferences (budget, categories, etc.)</li>
                <li>Browse products to build your history</li>
                <li>Click "Get Personalized Recommendations"</li>
              </ul>
              <p>The more you interact with products, the better our AI gets at understanding your taste!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get confidence level color and text
  const getConfidenceDisplay = (score) => {
    if (score >= 0.8) return { level: 'high', text: 'Perfect Match', color: '#28a745' };
    if (score >= 0.6) return { level: 'good', text: 'Great Match', color: '#17a2b8' };
    if (score >= 0.4) return { level: 'fair', text: 'Good Match', color: '#ffc107' };
    return { level: 'low', text: 'Possible Match', color: '#6c757d' };
  };

  // Recommendation Card Component
  const RecommendationCard = ({ recommendation, index }) => {
    const { product, explanation, confidence_score } = recommendation;
    const confidenceDisplay = getConfidenceDisplay(confidence_score || 0);

    return (
      <div className={`recommendation-card confidence-${confidenceDisplay.level}`}>
        <div className="card-header">
          <div className="rank-badge">#{index + 1}</div>
          <div className="confidence-badge" style={{ backgroundColor: confidenceDisplay.color }}>
            <span className="confidence-text">{confidenceDisplay.text}</span>
            <span className="confidence-score">{Math.round((confidence_score || 0) * 100)}%</span>
          </div>
        </div>

        <div className="card-content">
          <div className="product-info">
            <div className="product-header">
              <h4 className="product-name">{product.name}</h4>
              <div className="product-price">${product.price}</div>
            </div>

            <div className="product-meta">
              <span className="product-category">{product.category}</span>
              <span className="product-separator">•</span>
              <span className="product-brand">{product.brand}</span>
              <span className="product-separator">•</span>
              <div className="product-rating">
                <span className="rating-stars">
                  {'★'.repeat(Math.floor(product.rating || 0))}
                  {'☆'.repeat(5 - Math.floor(product.rating || 0))}
                </span>
                <span className="rating-value">({product.rating})</span>
              </div>
            </div>

            <p className="product-description">
              {product.description}
            </p>

            {product.features && product.features.length > 0 && (
              <div className="product-features">
                <strong>Key Features:</strong>
                <ul className="features-list">
                  {product.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                  {product.features.length > 3 && (
                    <li className="more-features">+{product.features.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="product-tags">
                {product.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="ai-explanation">
            <div className="explanation-header">
              <span className="ai-icon">🤖</span>
              <strong>Why we recommend this:</strong>
            </div>
            <p className="explanation-text">{explanation}</p>
          </div>

          <div className="card-footer">
            <div className="availability-info">
              {product.inventory > 10 ? (
                <span className="in-stock">✅ In Stock ({product.inventory} available)</span>
              ) : product.inventory > 0 ? (
                <span className="low-stock">⚠️ Only {product.inventory} left!</span>
              ) : (
                <span className="out-of-stock">❌ Currently out of stock</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate recommendation stats
  const stats = useMemo(() => {
    const scores = sortedRecommendations.map(r => r.confidence_score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highConfidence = scores.filter(s => s >= 0.8).length;
    
    return {
      total: sortedRecommendations.length,
      avgConfidence: avgScore,
      highConfidence
    };
  }, [sortedRecommendations]);

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <div className="header-content">
          <h3>Your AI-Powered Recommendations</h3>
          <div className="recommendations-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Recommendations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{Math.round(stats.avgConfidence * 100)}%</span>
              <span className="stat-label">Avg Match</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.highConfidence}</span>
              <span className="stat-label">Perfect Matches</span>
            </div>
          </div>
        </div>
        
        <div className="recommendations-subtitle">
          <p>Based on your preferences and browsing history, here are products our AI thinks you'll love:</p>
        </div>
      </div>

      <div className="recommendations-grid">
        {sortedRecommendations.map((recommendation, index) => (
          <RecommendationCard 
            key={`${recommendation.product.id}-${index}`}
            recommendation={recommendation}
            index={index}
          />
        ))}
      </div>

      <div className="recommendations-footer">
        <div className="footer-content">
          <div className="ai-disclaimer">
            <h5>How our AI recommendations work:</h5>
            <ul>
              <li>We analyze your stated preferences and browsing behavior</li>
              <li>Our AI matches products based on features, categories, and price ranges</li>
              <li>Confidence scores indicate how well each product matches your profile</li>
              <li>Explanations show why each product was recommended specifically for you</li>
            </ul>
          </div>
          
          <div className="improvement-tip">
            <p>💡 <strong>Tip:</strong> Browse more products and update your preferences to get even better recommendations!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;