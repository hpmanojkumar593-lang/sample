from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import os
from datetime import datetime
import uvicorn

from services.llm_service import LLMService
from services.product_service import ProductService
from config import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Product Recommendation API",
    description="AI-powered product recommendation engine using LLMs",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI available at /docs
    redoc_url="/redoc"  # ReDoc available at /redoc
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Initialize services
try:
    product_service = ProductService()
    llm_service = LLMService()
    logger.info("Services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# Pydantic models for request/response validation
class UserPreferences(BaseModel):
    priceRange: str = Field(default="all", description="Price range: all, budget, mid, premium, custom")
    customPriceRange: Optional[Dict[str, float]] = Field(None, description="Custom price range with min/max")
    categories: List[str] = Field(default_factory=list, description="Preferred categories")
    brands: List[str] = Field(default_factory=list, description="Preferred brands")
    minRating: float = Field(default=0, ge=0, le=5, description="Minimum product rating")
    lifestyleType: Optional[str] = Field(None, description="Lifestyle type")
    specificNeeds: Optional[str] = Field(None, description="Specific shopping needs")
    additionalNotes: Optional[str] = Field(None, description="Additional requirements")

class RecommendationRequest(BaseModel):
    preferences: UserPreferences
    browsing_history: List[str] = Field(default_factory=list, description="List of product IDs viewed")

class ProductFilter(BaseModel):
    categories: Optional[List[str]] = None
    brands: Optional[List[str]] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    max_rating: Optional[float] = Field(None, ge=0, le=5)
    in_stock_only: bool = True
    tags: Optional[List[str]] = None
    sort_by: str = Field("rating", regex="^(price|rating|inventory|name)$")
    sort_order: str = Field("desc", regex="^(asc|desc)$")
    limit: Optional[int] = Field(None, gt=0, le=100)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "product_service": "active",
            "llm_service": "active"
        }
    }

# Product endpoints
@app.get("/api/products")
async def get_products():
    """
    Return the full product catalog
    Returns direct array for test compatibility
    """
    try:
        products = product_service.get_all_products()
        return products  # Return direct array for test compatibility
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch products")

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """Get a specific product by ID"""
    try:
        product = product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {
            "product": product,
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch product")

@app.post("/api/products/filter")
async def filter_products(filter_request: ProductFilter):
    """Filter products based on various criteria"""
    try:
        filtered_products = product_service.filter_products(
            categories=filter_request.categories,
            brands=filter_request.brands,
            min_price=filter_request.min_price,
            max_price=filter_request.max_price,
            min_rating=filter_request.min_rating,
            max_rating=filter_request.max_rating,
            in_stock_only=filter_request.in_stock_only,
            tags=filter_request.tags,
            sort_by=filter_request.sort_by,
            sort_order=filter_request.sort_order,
            limit=filter_request.limit
        )
        
        return {
            "products": filtered_products,
            "count": len(filtered_products),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error filtering products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to filter products")

@app.get("/api/products/search")
async def search_products(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, gt=0, le=100, description="Maximum number of results")
):
    """Search products by name, description, features, or tags"""
    try:
        results = product_service.search_products(query, limit)
        return {
            "products": results,
            "count": len(results),
            "query": query,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error searching products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search products")

@app.get("/api/categories")
async def get_categories():
    """Get all available product categories"""
    try:
        categories = product_service.get_available_categories()
        return {
            "categories": categories,
            "count": len(categories),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")

# Main recommendation endpoint
@app.post("/api/recommendations")
async def get_recommendations(request: RecommendationRequest):
    """
    Generate personalized product recommendations based on user preferences
    and browsing history
    """
    try:
        logger.info(f"Generating recommendations for preferences: {request.preferences}")
        
        # Convert Pydantic model to dict
        user_preferences = request.preferences.dict(exclude_none=True)
        
        # Handle custom price range
        if user_preferences.get('priceRange') == 'custom' and user_preferences.get('customPriceRange'):
            custom_range = user_preferences['customPriceRange']
            user_preferences['price_range'] = {
                'min': custom_range.get('min', 0),
                'max': custom_range.get('max', float('inf'))
            }
        
        browsing_history = request.browsing_history
        
        # Validate inputs
        if not user_preferences and not browsing_history:
            raise HTTPException(
                status_code=400,
                detail="Either preferences or browsing history must be provided"
            )
        
        # Validate browsing history product IDs
        valid_history = []
        for product_id in browsing_history:
            if product_service.get_product_by_id(product_id):
                valid_history.append(product_id)
            else:
                logger.warning(f"Invalid product ID in browsing history: {product_id}")
        
        # Use the LLM service to generate recommendations
        recommendations = llm_service.generate_recommendations(
            user_preferences,
            valid_history,
            product_service.get_all_products()
        )
        
        logger.info(f"Generated {recommendations.get('count', 0)} recommendations")
        return recommendations
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate recommendations: {str(e)}"
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred while processing your request",
            "timestamp": datetime.now().isoformat()
        }
    )

# Development server runner
if __name__ == "__main__":
    # Configuration
    host = config.get("HOST", "0.0.0.0")
    port = int(config.get("PORT", 5000))  # Using port 5000
    debug = config.get("DEBUG", True)
    
    # Validate required configuration
    if not config.get('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY not found in configuration!")
        print("ERROR: OPENAI_API_KEY is required but not set.")
        print("Please check your .env file and ensure OPENAI_API_KEY is set.")
        exit(1)
    
    logger.info(f"Starting FastAPI server on {host}:{port}")
    logger.info(f"OpenAI API Key configured: {'Yes' if config.get('OPENAI_API_KEY') else 'No'}")
    logger.info(f"API Documentation available at: http://{host}:{port}/docs")
    
    # Run with uvicorn
    uvicorn.run(
        "app:app",  # Changed from "main:app" to "app:app"
        host=host,
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )