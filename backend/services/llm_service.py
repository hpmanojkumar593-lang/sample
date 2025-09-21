import openai
import json
import re
from config import config

class LLMService:
    """
    Service to handle interactions with the LLM API
    """
    
    def __init__(self):
        """
        Initialize the LLM service with configuration
        """
        # Set up OpenAI client (compatible with both old and new versions)
        openai.api_key = config['OPENAI_API_KEY']
        
        # For newer OpenAI library versions, initialize the client
        try:
            self.client = openai.OpenAI(api_key=config['OPENAI_API_KEY'])
            self.use_new_client = True
        except (AttributeError, TypeError):
            # Fall back to legacy API
            self.use_new_client = False
        
        self.model_name = config['MODEL_NAME']
        self.max_tokens = config['MAX_TOKENS']
        self.temperature = config['TEMPERATURE']
    
    def generate_recommendations(self, user_preferences, browsing_history, all_products):
        """
        Generate personalized product recommendations based on user preferences and browsing history
        
        Parameters:
        - user_preferences (dict): User's stated preferences
        - browsing_history (list): List of product IDs the user has viewed
        - all_products (list): Full product catalog
        
        Returns:
        - dict: Recommended products with explanations
        """
        try:
            # Get browsed products details
            browsed_products = []
            for product_id in browsing_history:
                for product in all_products:
                    if product["id"] == product_id:
                        browsed_products.append(product)
                        break
            
            # Create a prompt for the LLM
            prompt = self._create_recommendation_prompt(user_preferences, browsed_products, all_products)
            
            # Call the LLM API with proper error handling
            if self.use_new_client:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a helpful eCommerce product recommendation assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
                llm_response = response.choices[0].message.content
            else:
                # Legacy API call
                response = openai.ChatCompletion.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a helpful eCommerce product recommendation assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
                llm_response = response.choices[0].message.content
            
            # Parse the LLM response to extract recommendations
            recommendations = self._parse_recommendation_response(llm_response, all_products)
            
            return recommendations
            
        except Exception as e:
            # Handle any errors from the LLM API
            print(f"Error calling LLM API: {str(e)}")
            # Return fallback recommendations instead of raising exception
            return self._get_fallback_recommendations(user_preferences, browsing_history, all_products)
    
    def _create_recommendation_prompt(self, user_preferences, browsed_products, all_products):
        """
        Create a prompt for the LLM to generate recommendations
        
        This is where you should implement your prompt engineering strategy.
        
        Parameters:
        - user_preferences (dict): User's stated preferences
        - browsed_products (list): Products the user has viewed
        - all_products (list): Full product catalog
        
        Returns:
        - str: Prompt for the LLM
        """
        # PROMPT ENGINEERING IMPLEMENTATION
        
        # Step 1: Filter products to reduce token usage and improve relevance
        filtered_products = self._filter_relevant_products(user_preferences, all_products)
        
        # Step 2: Analyze browsing patterns
        browsing_insights = self._analyze_browsing_patterns(browsed_products)
        
        # Step 3: Build comprehensive prompt
        prompt_parts = []
        
        # Task description
        prompt_parts.append("""You are an expert product recommendation specialist. Your task is to analyze user preferences and browsing history to recommend exactly 5 products that best match their needs and interests.

IMPORTANT: You must select products ONLY from the AVAILABLE PRODUCTS list provided below.""")
        
        # User preferences section
        prompt_parts.append("\n=== USER PREFERENCES ===")
        if user_preferences:
            for key, value in user_preferences.items():
                if value:  # Only include non-empty preferences
                    if isinstance(value, list) and value:
                        prompt_parts.append(f"- {key.replace('_', ' ').title()}: {', '.join(value)}")
                    elif not isinstance(value, list):
                        prompt_parts.append(f"- {key.replace('_', ' ').title()}: {value}")
        else:
            prompt_parts.append("- No specific preferences provided")
        
        # Browsing history analysis
        prompt_parts.append("\n=== BROWSING HISTORY ANALYSIS ===")
        if browsed_products:
            prompt_parts.append(f"User has viewed {len(browsed_products)} products:")
            for product in browsed_products:
                prompt_parts.append(f"- {product['name']} | {product['category']} | ${product['price']} | Rating: {product['rating']}")
            
            if browsing_insights:
                prompt_parts.append(f"\nBrowsing Patterns:")
                for insight_key, insight_value in browsing_insights.items():
                    prompt_parts.append(f"- {insight_key}: {insight_value}")
        else:
            prompt_parts.append("- No browsing history available - focus on stated preferences")
        
        # Available products (filtered list)
        prompt_parts.append(f"\n=== AVAILABLE PRODUCTS ({len(filtered_products)} items) ===")
        for i, product in enumerate(filtered_products, 1):
            features_str = ', '.join(product.get('features', [])[:3])
            tags_str = ', '.join(product.get('tags', [])[:2])
            
            product_line = f"{i}. ID: {product['id']} | {product['name']} | {product['category']} | ${product['price']} | ★{product['rating']} | {product['brand']}"
            if features_str:
                product_line += f" | Features: {features_str}"
            if tags_str:
                product_line += f" | Tags: {tags_str}"
            
            prompt_parts.append(product_line)
        
        # Analysis instructions
        prompt_parts.append("""
=== RECOMMENDATION STRATEGY ===
1. Analyze user preferences and browsing patterns to understand their needs
2. Consider price sensitivity based on viewed products and stated preferences
3. Look for complementary products that work well together
4. Balance popular/highly-rated items with unique finds
5. Ensure variety in categories while staying relevant to user interests

=== OUTPUT FORMAT ===
Respond with a JSON array containing exactly 5 recommendations:

[
  {
    "product_id": "exact_id_from_available_products",
    "confidence_score": 0.85,
    "explanation": "2-3 sentences explaining why this product matches the user's profile, referencing specific preferences or browsing patterns."
  }
]

REQUIREMENTS:
- Use only product IDs from the AVAILABLE PRODUCTS list above
- Confidence scores between 0.1 and 1.0
- Each explanation should be specific and personalized
- Ensure 5 different products are recommended""")
        
        return "\n".join(prompt_parts)
    
    def _filter_relevant_products(self, user_preferences, all_products):
        """
        Filter products to reduce context size while maintaining relevance
        """
        # Extract filtering criteria
        preferred_categories = user_preferences.get('categories', [])
        price_range = user_preferences.get('priceRange', 'all')
        min_rating = 4.0  # Default to high-quality products
        
        filtered = []
        
        for product in all_products:
            # Skip out of stock products
            if product.get('inventory', 0) <= 0:
                continue
            
            # Skip low-rated products
            if product.get('rating', 0) < min_rating:
                continue
            
            # Apply price range filter
            price = product.get('price', 0)
            if price_range == 'budget' and price >= 50:
                continue
            elif price_range == 'mid' and (price < 50 or price > 150):
                continue
            elif price_range == 'premium' and price <= 150:
                continue
            
            # If categories are specified, prioritize those but include some variety
            if preferred_categories:
                if product['category'] in preferred_categories:
                    filtered.append(product)
                elif len(filtered) < 15:  # Include some variety
                    filtered.append(product)
            else:
                filtered.append(product)
        
        # Sort by rating to prioritize quality products
        filtered.sort(key=lambda x: x.get('rating', 0), reverse=True)
        
        # Limit to 20 products to manage context size
        return filtered[:20]
    
    def _analyze_browsing_patterns(self, browsed_products):
        """
        Analyze browsing history to extract insights
        """
        if not browsed_products:
            return {}
        
        # Calculate patterns
        categories = [p['category'] for p in browsed_products]
        prices = [p['price'] for p in browsed_products]
        brands = [p['brand'] for p in browsed_products]
        ratings = [p['rating'] for p in browsed_products]
        
        insights = {
            "Primary categories": ', '.join(list(set(categories))[:3]),
            "Average price viewed": f"${sum(prices) / len(prices):.2f}",
            "Price range": f"${min(prices):.2f} - ${max(prices):.2f}",
            "Preferred brands": ', '.join(list(set(brands))[:3]),
            "Quality preference": f"Average rating viewed: {sum(ratings) / len(ratings):.1f}"
        }
        
        return insights
    
    def _parse_recommendation_response(self, llm_response, all_products):
        """
        Parse the LLM response to extract product recommendations
        
        Parameters:
        - llm_response (str): Raw response from the LLM
        - all_products (list): Full product catalog to match IDs with full product info
        
        Returns:
        - dict: Structured recommendations
        """
        try:
            # Extract JSON from the response
            json_match = re.search(r'\[.*\]', llm_response, re.DOTALL)
            if not json_match:
                print("Warning: No JSON array found in LLM response")
                return self._fallback_parsing(llm_response, all_products)
            
            json_str = json_match.group()
            rec_data = json.loads(json_str)
            
            # Create product lookup dictionary
            product_map = {p['id']: p for p in all_products}
            
            # Process and validate recommendations
            recommendations = []
            for rec in rec_data:
                product_id = rec.get('product_id')
                
                # Validate product ID exists
                if not product_id or product_id not in product_map:
                    print(f"Warning: Invalid product ID: {product_id}")
                    continue
                
                # Validate confidence score
                confidence = rec.get('confidence_score', 0.5)
                if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
                    confidence = 0.5
                
                # Add enriched recommendation
                recommendations.append({
                    "product": product_map[product_id],
                    "explanation": rec.get('explanation', 'Recommended based on your preferences'),
                    "confidence_score": confidence
                })
            
            return {
                "recommendations": recommendations[:5],  # Ensure max 5
                "count": len(recommendations[:5]),
                "status": "success"
            }
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            # Fallback: try to extract product IDs from text
            return self._fallback_parsing(llm_response, all_products)
        
        except Exception as e:
            print(f"Error parsing LLM response: {str(e)}")
            return {
                "recommendations": [],
                "count": 0,
                "error": f"Failed to parse recommendations: {str(e)}",
                "status": "error"
            }
    
    def _fallback_parsing(self, llm_response, all_products):
        """
        Fallback parsing when JSON extraction fails
        """
        try:
            # Extract product IDs using regex
            product_ids = re.findall(r'prod\d+', llm_response)
            product_map = {p['id']: p for p in all_products}
            
            recommendations = []
            for pid in product_ids[:5]:  # Max 5 recommendations
                if pid in product_map:
                    recommendations.append({
                        "product": product_map[pid],
                        "explanation": "Recommended based on your preferences (parsing error occurred)",
                        "confidence_score": 0.6
                    })
            
            return {
                "recommendations": recommendations,
                "count": len(recommendations),
                "status": "partial_success",
                "error": "JSON parsing failed, extracted from text"
            }
        except Exception as e:
            print(f"Fallback parsing failed: {str(e)}")
            return self._get_fallback_recommendations({}, [], all_products)
    
    def _get_fallback_recommendations(self, user_preferences, browsing_history, all_products):
        """
        Provide rule-based fallback recommendations if LLM fails completely
        """
        try:
            print("Using fallback recommendations due to LLM failure")
            
            # Simple rule-based recommendation logic
            preferred_categories = user_preferences.get('categories', [])
            price_range = user_preferences.get('priceRange', 'all')
            
            # Filter and sort products
            candidates = []
            for product in all_products:
                if preferred_categories and product['category'] not in preferred_categories:
                    continue
                
                # Apply price filtering
                price = product.get('price', 0)
                if price_range == 'budget' and price >= 50:
                    continue
                elif price_range == 'mid' and (price < 50 or price > 150):
                    continue
                elif price_range == 'premium' and price <= 150:
                    continue
                    
                if product.get('inventory', 0) <= 0:
                    continue
                candidates.append(product)
            
            # Sort by rating and select top 5
            candidates.sort(key=lambda x: x.get('rating', 0), reverse=True)
            
            recommendations = []
            for product in candidates[:5]:
                recommendations.append({
                    "product": product,
                    "explanation": f"Highly rated {product['category'].lower()} product that matches your preferences",
                    "confidence_score": 0.7
                })
            
            return {
                "recommendations": recommendations,
                "count": len(recommendations),
                "status": "fallback",
                "message": "Using rule-based recommendations due to LLM service issues"
            }
        except Exception as e:
            print(f"Fallback recommendations failed: {str(e)}")
            return {
                "recommendations": [],
                "count": 0,
                "status": "error",
                "error": "Both LLM and fallback recommendations failed"
            }