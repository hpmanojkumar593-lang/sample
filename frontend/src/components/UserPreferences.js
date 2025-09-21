// components/UserPreferences.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';

const UserPreferences = ({ preferences, products, onPreferencesChange }) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Update local state when props change
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // Get unique categories and brands from products
  const { categories, brands, priceStats } = useMemo(() => {
    if (!products || products.length === 0) {
      return { categories: [], brands: [], priceStats: { min: 0, max: 1000, avg: 100 } };
    }

    const uniqueCategories = [...new Set(products.map(p => p.category))].sort();
    const uniqueBrands = [...new Set(products.map(p => p.brand))].sort();
    const prices = products.map(p => p.price).filter(p => p > 0);
    
    const priceStats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };

    return { categories: uniqueCategories, brands: uniqueBrands, priceStats };
  }, [products]);

  // Validation function
  const validatePreferences = useCallback((prefs) => {
    const errors = {};
    
    // Price range validation
    if (prefs.priceRange === 'custom') {
      if (prefs.customPriceRange?.min >= prefs.customPriceRange?.max) {
        errors.priceRange = 'Minimum price must be less than maximum price';
      }
      if (prefs.customPriceRange?.min < 0) {
        errors.priceRange = 'Prices cannot be negative';
      }
    }
    
    // Category validation
    if (prefs.categories && prefs.categories.length > 5) {
      errors.categories = 'Please select no more than 5 categories for better recommendations';
    }
    
    return errors;
  }, []);

  // Handle preference updates with validation
  const updatePreferences = useCallback((newPrefs) => {
    const errors = validatePreferences(newPrefs);
    setValidationErrors(errors);
    
    // Only update if no critical errors
    if (Object.keys(errors).length === 0 || !errors.priceRange) {
      setLocalPreferences(newPrefs);
      onPreferencesChange(newPrefs);
    }
  }, [onPreferencesChange, validatePreferences]);

  // Handle category selection
  const handleCategoryChange = useCallback((category, isChecked) => {
    const updatedCategories = isChecked
      ? [...localPreferences.categories, category]
      : localPreferences.categories.filter(c => c !== category);

    updatePreferences({
      ...localPreferences,
      categories: updatedCategories
    });
  }, [localPreferences, updatePreferences]);

  // Handle brand selection
  const handleBrandChange = useCallback((brand, isChecked) => {
    const updatedBrands = isChecked
      ? [...localPreferences.brands, brand]
      : localPreferences.brands.filter(b => b !== brand);

    updatePreferences({
      ...localPreferences,
      brands: updatedBrands
    });
  }, [localPreferences, updatePreferences]);

  // Handle price range change
  const handlePriceRangeChange = useCallback((type, value) => {
    if (type === 'preset') {
      updatePreferences({
        ...localPreferences,
        priceRange: value,
        customPriceRange: value === 'custom' ? { min: 0, max: 1000 } : undefined
      });
    } else if (type === 'custom') {
      updatePreferences({
        ...localPreferences,
        priceRange: 'custom',
        customPriceRange: {
          ...localPreferences.customPriceRange,
          ...value
        }
      });
    }
  }, [localPreferences, updatePreferences]);

  // Handle simple preference changes
  const handleSimpleChange = useCallback((field, value) => {
    updatePreferences({
      ...localPreferences,
      [field]: value
    });
  }, [localPreferences, updatePreferences]);

  // Clear all preferences
  const clearPreferences = useCallback(() => {
    const clearedPrefs = {
      priceRange: 'all',
      customPriceRange: undefined,
      categories: [],
      brands: [],
      minRating: 0,
      lifestyleType: '',
      specificNeeds: '',
      additionalNotes: ''
    };
    setValidationErrors({});
    updatePreferences(clearedPrefs);
  }, [updatePreferences]);

  // Check if user has set any preferences
  const hasPreferences = useMemo(() => {
    return localPreferences.categories.length > 0 ||
           localPreferences.brands.length > 0 ||
           localPreferences.priceRange !== 'all' ||
           localPreferences.minRating > 0 ||
           localPreferences.lifestyleType ||
           localPreferences.specificNeeds ||
           localPreferences.additionalNotes;
  }, [localPreferences]);

  // Lifestyle options
  const lifestyleOptions = [
    { value: 'tech-savvy', label: 'Tech Enthusiast', icon: '💻', description: 'Latest gadgets and technology' },
    { value: 'health-conscious', label: 'Health & Fitness', icon: '💪', description: 'Wellness and active lifestyle' },
    { value: 'home-focused', label: 'Home & Family', icon: '🏠', description: 'Home improvement and family products' },
    { value: 'fashion-forward', label: 'Fashion Forward', icon: '👔', description: 'Style and fashion trends' },
    { value: 'budget-conscious', label: 'Budget Conscious', icon: '💰', description: 'Value and cost-effective options' },
    { value: 'eco-friendly', label: 'Eco-Friendly', icon: '🌱', description: 'Sustainable and green products' },
    { value: 'professional', label: 'Professional', icon: '💼', description: 'Work and business needs' },
    { value: 'creative', label: 'Creative & Artistic', icon: '🎨', description: 'Art and creative pursuits' }
  ];

  // Specific needs options
  const specificNeedsOptions = [
    { value: 'gift-shopping', label: 'Gift shopping', description: 'Finding gifts for others' },
    { value: 'professional-use', label: 'Professional use', description: 'Work-related purchases' },
    { value: 'personal-enjoyment', label: 'Personal enjoyment', description: 'For personal use and pleasure' },
    { value: 'home-improvement', label: 'Home improvement', description: 'Upgrading living space' },
    { value: 'health-fitness', label: 'Health & fitness', description: 'Wellness and exercise goals' },
    { value: 'work-from-home', label: 'Work from home', description: 'Remote work setup' },
    { value: 'travel-outdoor', label: 'Travel & outdoor', description: 'Adventure and travel needs' },
    { value: 'creative-projects', label: 'Creative projects', description: 'Arts and crafts' },
    { value: 'learning-education', label: 'Learning & education', description: 'Educational purposes' },
    { value: 'entertainment', label: 'Entertainment', description: 'Fun and leisure activities' }
  ];

  // Get price range display text
  const getPriceRangeDisplay = () => {
    switch (localPreferences.priceRange) {
      case 'budget': return 'Under $50';
      case 'mid': return '$50 - $150';
      case 'premium': return '$150+';
      case 'custom': 
        return localPreferences.customPriceRange 
          ? `$${localPreferences.customPriceRange.min} - $${localPreferences.customPriceRange.max}`
          : 'Custom range';
      default: return 'Any budget';
    }
  };

  return (
    <div className="preferences-container">
      <div className="preferences-header">
        <div className="header-main">
          <h3>Your Preferences</h3>
          <p>Help us understand what you're looking for to get better AI recommendations</p>
        </div>
        <button 
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          type="button"
        >
          {isExpanded ? 'Show Less' : 'More Options'}
        </button>
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="validation-errors">
          {Object.entries(validationErrors).map(([field, error]) => (
            <div key={field} className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          ))}
        </div>
      )}

      <div className="preferences-form">
        {/* Quick Preferences - Always Visible */}
        <div className="preference-section quick-prefs">
          <h4>Essential Preferences</h4>
          
          {/* Budget Range */}
          <div className="preference-group">
            <label>Budget Range:</label>
            <div className="price-range-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="priceRange"
                  value="all"
                  checked={localPreferences.priceRange === 'all'}
                  onChange={(e) => handlePriceRangeChange('preset', e.target.value)}
                />
                <span>Any Budget</span>
                <small>All price ranges</small>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="priceRange"
                  value="budget"
                  checked={localPreferences.priceRange === 'budget'}
                  onChange={(e) => handlePriceRangeChange('preset', e.target.value)}
                />
                <span>Budget Friendly</span>
                <small>Under $50</small>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="priceRange"
                  value="mid"
                  checked={localPreferences.priceRange === 'mid'}
                  onChange={(e) => handlePriceRangeChange('preset', e.target.value)}
                />
                <span>Mid Range</span>
                <small>$50 - $150</small>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="priceRange"
                  value="premium"
                  checked={localPreferences.priceRange === 'premium'}
                  onChange={(e) => handlePriceRangeChange('preset', e.target.value)}
                />
                <span>Premium</span>
                <small>$150+</small>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="priceRange"
                  value="custom"
                  checked={localPreferences.priceRange === 'custom'}
                  onChange={(e) => handlePriceRangeChange('preset', e.target.value)}
                />
                <span>Custom Range</span>
                <small>Set your own limits</small>
              </label>
            </div>

            {/* Custom Price Range Inputs */}
            {localPreferences.priceRange === 'custom' && (
              <div className="custom-price-range">
                <div className="price-inputs">
                  <div className="price-input-group">
                    <label htmlFor="min-price">Min Price ($):</label>
                    <input
                      id="min-price"
                      type="number"
                      min="0"
                      value={localPreferences.customPriceRange?.min || 0}
                      onChange={(e) => handlePriceRangeChange('custom', {
                        min: parseInt(e.target.value) || 0
                      })}
                      className="price-input"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="price-input-group">
                    <label htmlFor="max-price">Max Price ($):</label>
                    <input
                      id="max-price"
                      type="number"
                      min={localPreferences.customPriceRange?.min || 0}
                      value={localPreferences.customPriceRange?.max || 1000}
                      onChange={(e) => handlePriceRangeChange('custom', {
                        max: parseInt(e.target.value) || 1000
                      })}
                      className="price-input"
                      placeholder="1000"
                    />
                  </div>
                </div>
                
                {priceStats && (
                  <div className="price-suggestions">
                    <small>
                      Suggestion: Products range from ${Math.round(priceStats.min)} to ${Math.round(priceStats.max)} 
                      (avg: ${Math.round(priceStats.avg)})
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preferred Categories */}
          <div className="preference-group">
            <label>Preferred Categories:</label>
            <div className="category-grid">
              {categories.slice(0, 6).map(category => {
                const productCount = products.filter(p => p.category === category).length;
                const isSelected = localPreferences.categories.includes(category);
                
                return (
                  <label key={category} className={`checkbox-option category-option ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    />
                    <span className="category-content">
                      <span className="category-name">{category}</span>
                      <small className="category-count">({productCount} products)</small>
                    </span>
                    <span className="checkmark"></span>
                  </label>
                );
              })}
            </div>
            
            {categories.length > 6 && (
              <button 
                className="show-more-btn"
                onClick={() => setIsExpanded(true)}
                type="button"
              >
                Show {categories.length - 6} more categories
              </button>
            )}
            
            {validationErrors.categories && (
              <div className="field-error">{validationErrors.categories}</div>
            )}
          </div>

          {/* Quality Preference */}
          <div className="preference-group">
            <label>Minimum Quality Rating:</label>
            <div className="rating-selector">
              {[0, 3, 3.5, 4, 4.5, 5].map(rating => (
                <label key={rating} className={`radio-option rating-option ${localPreferences.minRating === rating ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="minRating"
                    value={rating}
                    checked={localPreferences.minRating === rating}
                    onChange={(e) => handleSimpleChange('minRating', parseFloat(e.target.value))}
                  />
                  <span className="rating-display">
                    {rating === 0 ? (
                      <span>Any Rating</span>
                    ) : (
                      <span>
                        {'★'.repeat(Math.floor(rating))}
                        {rating % 1 !== 0 && '☆'}
                        <span className="rating-text">{rating}+ stars</span>
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Extended Preferences - Shown when expanded */}
        {isExpanded && (
          <div className="preference-section extended-prefs">
            <h4>Detailed Preferences</h4>

            {/* All Categories */}
            {categories.length > 6 && (
              <div className="preference-group">
                <label>Additional Categories:</label>
                <div className="category-grid extended">
                  {categories.slice(6).map(category => {
                    const productCount = products.filter(p => p.category === category).length;
                    const isSelected = localPreferences.categories.includes(category);
                    
                    return (
                      <label key={category} className={`checkbox-option category-option ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleCategoryChange(category, e.target.checked)}
                        />
                        <span className="category-content">
                          <span className="category-name">{category}</span>
                          <small className="category-count">({productCount})</small>
                        </span>
                        <span className="checkmark"></span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Brand Preferences */}
            <div className="preference-group">
              <label>Preferred Brands (Optional):</label>
              <div className="brand-selector">
                <div className="brand-grid">
                  {brands.slice(0, 12).map(brand => {
                    const productCount = products.filter(p => p.brand === brand).length;
                    const isSelected = localPreferences.brands.includes(brand);
                    
                    return (
                      <label key={brand} className={`checkbox-option brand-option ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleBrandChange(brand, e.target.checked)}
                        />
                        <span className="brand-content">
                          <span className="brand-name">{brand}</span>
                          <small className="brand-count">({productCount})</small>
                        </span>
                        <span className="checkmark"></span>
                      </label>
                    );
                  })}
                </div>
                
                {brands.length > 12 && (
                  <details className="more-brands">
                    <summary>Show {brands.length - 12} more brands</summary>
                    <div className="brand-grid">
                      {brands.slice(12).map(brand => {
                        const productCount = products.filter(p => p.brand === brand).length;
                        const isSelected = localPreferences.brands.includes(brand);
                        
                        return (
                          <label key={brand} className={`checkbox-option brand-option ${isSelected ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleBrandChange(brand, e.target.checked)}
                            />
                            <span className="brand-content">
                              <span className="brand-name">{brand}</span>
                              <small className="brand-count">({productCount})</small>
                            </span>
                            <span className="checkmark"></span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Lifestyle Type */}
            <div className="preference-group">
              <label>Lifestyle Type (Optional):</label>
              <div className="lifestyle-options">
                <label className={`radio-option lifestyle-option ${!localPreferences.lifestyleType ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="lifestyleType"
                    value=""
                    checked={!localPreferences.lifestyleType}
                    onChange={(e) => handleSimpleChange('lifestyleType', e.target.value)}
                  />
                  <span className="lifestyle-content">
                    <span className="lifestyle-main">Not specified</span>
                    <small>No specific lifestyle preference</small>
                  </span>
                </label>
                
                {lifestyleOptions.map(option => (
                  <label key={option.value} className={`radio-option lifestyle-option ${localPreferences.lifestyleType === option.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="lifestyleType"
                      value={option.value}
                      checked={localPreferences.lifestyleType === option.value}
                      onChange={(e) => handleSimpleChange('lifestyleType', e.target.value)}
                    />
                    <span className="lifestyle-content">
                      <span className="lifestyle-main">
                        <span className="lifestyle-icon">{option.icon}</span>
                        {option.label}
                      </span>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Specific Needs */}
            <div className="preference-group">
              <label htmlFor="specific-needs">What are you shopping for?</label>
              <select
                id="specific-needs"
                value={localPreferences.specificNeeds || ''}
                onChange={(e) => handleSimpleChange('specificNeeds', e.target.value)}
                className="needs-select"
              >
                <option value="">Select your primary need...</option>
                {specificNeedsOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Notes */}
            <div className="preference-group">
              <label htmlFor="additional-notes">Additional Notes (Optional):</label>
              <textarea
                id="additional-notes"
                value={localPreferences.additionalNotes || ''}
                onChange={(e) => handleSimpleChange('additionalNotes', e.target.value)}
                placeholder="Any specific requirements or preferences not covered above? e.g., prefer wireless products, looking for eco-friendly options, need something durable for outdoor use..."
                className="notes-textarea"
                rows="3"
                maxLength="500"
              />
              <div className="character-count">
                {(localPreferences.additionalNotes || '').length}/500 characters
              </div>
            </div>
          </div>
        )}

        {/* Preferences Summary */}
        {hasPreferences && (
          <div className="preferences-summary">
            <h5>Your Current Preferences Summary:</h5>
            <div className="summary-grid">
              {localPreferences.priceRange !== 'all' && (
                <div className="summary-item">
                  <span className="summary-icon">💰</span>
                  <div className="summary-details">
                    <span className="summary-label">Budget:</span>
                    <span className="summary-value">{getPriceRangeDisplay()}</span>
                  </div>
                </div>
              )}
              
              {localPreferences.categories.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">🏷️</span>
                  <div className="summary-details">
                    <span className="summary-label">Categories ({localPreferences.categories.length}):</span>
                    <span className="summary-value">{localPreferences.categories.join(', ')}</span>
                  </div>
                </div>
              )}
              
              {localPreferences.brands.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">🏭</span>
                  <div className="summary-details">
                    <span className="summary-label">Brands ({localPreferences.brands.length}):</span>
                    <span className="summary-value">{localPreferences.brands.join(', ')}</span>
                  </div>
                </div>
              )}
              
              {localPreferences.minRating > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">⭐</span>
                  <div className="summary-details">
                    <span className="summary-label">Min Rating:</span>
                    <span className="summary-value">{localPreferences.minRating}+ stars</span>
                  </div>
                </div>
              )}
              
              {localPreferences.lifestyleType && (
                <div className="summary-item">
                  <span className="summary-icon">
                    {lifestyleOptions.find(opt => opt.value === localPreferences.lifestyleType)?.icon}
                  </span>
                  <div className="summary-details">
                    <span className="summary-label">Lifestyle:</span>
                    <span className="summary-value">
                      {lifestyleOptions.find(opt => opt.value === localPreferences.lifestyleType)?.label}
                    </span>
                  </div>
                </div>
              )}
              
              {localPreferences.specificNeeds && (
                <div className="summary-item">
                  <span className="summary-icon">🎯</span>
                  <div className="summary-details">
                    <span className="summary-label">Shopping for:</span>
                    <span className="summary-value">
                      {specificNeedsOptions.find(opt => opt.value === localPreferences.specificNeeds)?.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="summary-actions">
              <button 
                onClick={clearPreferences}
                className="clear-preferences-btn"
                type="button"
              >
                Clear All Preferences
              </button>
            </div>
          </div>
        )}

        {/* No Preferences Message */}
        {!hasPreferences && (
          <div className="no-preferences-message">
            <div className="message-content">
              <div className="message-icon">🎯</div>
              <h4>Set your preferences to get better recommendations</h4>
              <p>
                Tell us what you're looking for and we'll use AI to find the perfect products for you.
                The more preferences you set, the more personalized your recommendations will be!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPreferences;