// App.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './styles/App.css';
import Catalog from './components/Catalog';
import UserPreferences from './components/UserPreferences';
import Recommendations from './components/Recommendations';
import BrowsingHistory from './components/BrowsingHistory';
import { fetchProducts, fetchCategories, getRecommendations, healthCheck, ApiError } from './services/api';

function App() {
  // Core state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // User data state
  const [userPreferences, setUserPreferences] = useState({
    priceRange: 'all',
    categories: [],
    brands: [],
    minRating: 0,
    lifestyleType: '',
    specificNeeds: ''
  });
  
  const [browsingHistory, setBrowsingHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // UI state
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('catalog');
  const [apiStatus, setApiStatus] = useState('unknown');

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsInitialLoading(true);
        setError(null);

        // Check API health first
        try {
          await healthCheck();
          setApiStatus('connected');
        } catch (err) {
          setApiStatus('disconnected');
          throw new Error('Unable to connect to the recommendation service. Please check if the backend is running.');
        }

        // Load products and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories().catch(() => []) // Categories are optional
        ]);

        if (!productsData || productsData.length === 0) {
          throw new Error('No products available. Please check the backend service.');
        }

        setProducts(productsData);
        setCategories(categoriesData);

      } catch (err) {
        console.error('Error loading initial data:', err);
        if (err instanceof ApiError) {
          setError(`API Error: ${err.message}`);
        } else {
          setError(err.message || 'Failed to load product data. Please refresh the page.');
        }
        setApiStatus('error');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle product click to add to browsing history
  const handleProductClick = useCallback((productId) => {
    setBrowsingHistory(prevHistory => {
      // Avoid duplicates but update position
      const filteredHistory = prevHistory.filter(id => id !== productId);
      // Add to beginning and limit to 50 items
      return [productId, ...filteredHistory].slice(0, 50);
    });
  }, []);

  // Update user preferences with validation
  const handlePreferencesChange = useCallback((newPreferences) => {
    // Validate preferences
    const validatedPreferences = {
      ...newPreferences,
      categories: newPreferences.categories || [],
      brands: newPreferences.brands || [],
      minRating: Math.max(0, Math.min(5, newPreferences.minRating || 0))
    };

    setUserPreferences(validatedPreferences);
  }, []);

  // Generate recommendations with enhanced error handling
  const handleGetRecommendations = useCallback(async () => {
    // Validation
    if (browsingHistory.length === 0 && userPreferences.categories.length === 0) {
      setError('Please set some preferences or browse products before getting recommendations.');
      return;
    }

    setIsLoadingRecommendations(true);
    setError(null);

    try {
      const response = await getRecommendations(userPreferences, browsingHistory);
      
      if (response.recommendations && response.recommendations.length > 0) {
        setRecommendations(response.recommendations);
        setActiveView('recommendations');
      } else {
        setRecommendations([]);
        if (response.error) {
          setError(`Recommendation Error: ${response.error}`);
        } else {
          setError('No recommendations found. Try adjusting your preferences or browsing more products.');
        }
      }

    } catch (err) {
      console.error('Error getting recommendations:', err);
      if (err instanceof ApiError) {
        setError(`Failed to get recommendations: ${err.message}`);
      } else {
        setError('Unable to generate recommendations. Please try again.');
      }
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [userPreferences, browsingHistory]);

  // Clear browsing history
  const handleClearHistory = useCallback(() => {
    setBrowsingHistory([]);
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const hasPreferences = userPreferences.categories.length > 0 || 
                          userPreferences.priceRange !== 'all' ||
                          userPreferences.brands.length > 0 ||
                          userPreferences.minRating > 0 ||
                          userPreferences.lifestyleType ||
                          userPreferences.specificNeeds;

    const canGetRecommendations = hasPreferences || browsingHistory.length > 0;

    return {
      hasPreferences,
      canGetRecommendations,
      totalInteractions: browsingHistory.length + (hasPreferences ? 1 : 0)
    };
  }, [userPreferences, browsingHistory.length]);

  // Loading screen
  if (isInitialLoading) {
    return (
      <div className="app loading">
        <div className="loading-screen">
          <div className="loading-animation">
            <div className="loading-spinner"></div>
          </div>
          <h2>Loading AI Product Recommendation Engine...</h2>
          <p>Connecting to services and loading product catalog</p>
          {apiStatus === 'disconnected' && (
            <p className="loading-warning">
              Note: Make sure the backend server is running on port 5000
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>AI-Powered Product Recommendation Engine</h1>
          <p>Discover products tailored to your unique preferences</p>
          
          {/* Status indicator */}
          <div className="status-indicators">
            <div className={`status-indicator api-status ${apiStatus}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {apiStatus === 'connected' && 'Connected'}
                {apiStatus === 'disconnected' && 'Disconnected'}
                {apiStatus === 'error' && 'Error'}
              </span>
            </div>
            
            {computedValues.totalInteractions > 0 && (
              <div className="interaction-counter">
                {computedValues.totalInteractions} interactions recorded
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              onClick={clearError} 
              className="error-close"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-content">
          <div className="nav-buttons">
            <button 
              className={`nav-button ${activeView === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveView('catalog')}
            >
              <span className="nav-icon">🏪</span>
              <span className="nav-text">Catalog</span>
              <span className="nav-count">({products.length})</span>
            </button>
            
            <button 
              className={`nav-button ${activeView === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveView('preferences')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Preferences</span>
              {computedValues.hasPreferences && <span className="nav-indicator">•</span>}
            </button>
            
            <button 
              className={`nav-button ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              <span className="nav-icon">📱</span>
              <span className="nav-text">History</span>
              <span className="nav-count">({browsingHistory.length})</span>
            </button>
            
            <button 
              className={`nav-button ${activeView === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveView('recommendations')}
            >
              <span className="nav-icon">🎯</span>
              <span className="nav-text">Recommendations</span>
              <span className="nav-count">({recommendations.length})</span>
            </button>
          </div>

          {/* Quick Action Button */}
          {computedValues.canGetRecommendations && activeView !== 'recommendations' && (
            <button 
              className="quick-recommend-btn"
              onClick={handleGetRecommendations}
              disabled={isLoadingRecommendations}
            >
              {isLoadingRecommendations ? 'Generating...' : 'Get AI Recommendations'}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-content">
        {activeView === 'catalog' && (
          <div className="content-section">
            <Catalog 
              products={products}
              onProductClick={handleProductClick}
              browsingHistory={browsingHistory}
            />
          </div>
        )}

        {activeView === 'preferences' && (
          <div className="content-section">
            <UserPreferences 
              preferences={userPreferences}
              products={products}
              onPreferencesChange={handlePreferencesChange}
            />
          </div>
        )}

        {activeView === 'history' && (
          <div className="content-section">
            <BrowsingHistory 
              history={browsingHistory}
              products={products}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {activeView === 'recommendations' && (
          <div className="content-section">
            <Recommendations 
              recommendations={recommendations}
              isLoading={isLoadingRecommendations}
            />
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {computedValues.canGetRecommendations && (
        <div className="floating-actions">
          <button 
            className={`fab ${isLoadingRecommendations ? 'loading' : ''}`}
            onClick={handleGetRecommendations}
            disabled={isLoadingRecommendations}
            title="Get AI-powered recommendations"
          >
            {isLoadingRecommendations ? (
              <div className="fab-spinner"></div>
            ) : (
              <span className="fab-icon">🤖</span>
            )}
            <span className="fab-text">
              {isLoadingRecommendations ? 'Generating...' : 'Get AI Recommendations'}
            </span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-stats">
            <div className="stat">
              <span className="stat-value">{products.length}</span>
              <span className="stat-label">Products</span>
            </div>
            <div className="stat">
              <span className="stat-value">{browsingHistory.length}</span>
              <span className="stat-label">Viewed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{recommendations.length}</span>
              <span className="stat-label">Recommended</span>
            </div>
          </div>
          
          <div className="footer-info">
            <p>Powered by AI • Built with React & Flask</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;