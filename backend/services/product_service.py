import json
from config import config

class ProductService:
    """
    Service to handle product data operations
    """
    
    def __init__(self):
        """
        Initialize the product service with data path from config
        """
        self.data_path = config['DATA_PATH']
        self.products = self._load_products()
    
    def _load_products(self):
        """
        Load products from the JSON data file
        """
        try:
            with open(self.data_path, 'r') as file:
                products = json.load(file)
                print(f"Loaded {len(products)} products from {self.data_path}")
                return products
        except FileNotFoundError:
            print(f"Error: Product data file not found at {self.data_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in product data file - {str(e)}")
            return []
        except Exception as e:
            print(f"Error loading product data: {str(e)}")
            return []
    
    def get_all_products(self):
        """
        Return all products
        """
        return self.products
    
    def get_product_by_id(self, product_id):
        """
        Get a specific product by ID
        """
        for product in self.products:
            if product['id'] == product_id:
                return product
        return None
    
    def get_products_by_category(self, category):
        """
        Get products filtered by category
        """
        return [p for p in self.products if p['category'] == category]
    
    # Additional helper methods that support the LLM service
    def get_available_categories(self):
        """
        Get list of all available product categories
        """
        categories = set()
        for product in self.products:
            if 'category' in product:
                categories.add(product['category'])
        return sorted(list(categories))
    
    def get_available_brands(self):
        """
        Get list of all available brands
        """
        brands = set()
        for product in self.products:
            if 'brand' in product:
                brands.add(product['brand'])
        return sorted(list(brands))
    
    def filter_products(self, categories=None, min_price=None, max_price=None, 
                       min_rating=None, in_stock_only=True):
        """
        Filter products based on basic criteria
        """
        filtered = []
        
        for product in self.products:
            # Category filter
            if categories and product.get('category') not in categories:
                continue
            
            # Price filters
            price = product.get('price', 0)
            if min_price is not None and price < min_price:
                continue
            if max_price is not None and price > max_price:
                continue
            
            # Rating filter
            if min_rating is not None and product.get('rating', 0) < min_rating:
                continue
            
            # Stock filter
            if in_stock_only and product.get('inventory', 0) <= 0:
                continue
            
            filtered.append(product)
        
        return filtered
    
    def search_products(self, query, limit=20):
        """
        Simple search functionality by name, description, and tags
        """
        if not query:
            return []
        
        query_lower = query.lower()
        matches = []
        
        for product in self.products:
            score = 0
            
            # Check name (highest priority)
            if query_lower in product.get('name', '').lower():
                score += 3
            
            # Check description
            if query_lower in product.get('description', '').lower():
                score += 2
            
            # Check tags
            tags = product.get('tags', [])
            for tag in tags:
                if query_lower in tag.lower():
                    score += 1
                    break
            
            # Check category
            if query_lower in product.get('category', '').lower():
                score += 1
            
            if score > 0:
                matches.append((product, score))
        
        # Sort by relevance score
        matches.sort(key=lambda x: x[1], reverse=True)
        return [match[0] for match in matches[:limit]]