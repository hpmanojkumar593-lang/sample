import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_bool_env(env_var: str, default: bool = False) -> bool:
    """Convert environment variable to boolean"""
    value = os.getenv(env_var, str(default)).lower()
    return value in ('true', '1', 'yes', 'on')

def get_int_env(env_var: str, default: int) -> int:
    """Convert environment variable to integer with error handling"""
    try:
        return int(os.getenv(env_var, str(default)))
    except ValueError:
        print(f"Warning: Invalid integer value for {env_var}, using default: {default}")
        return default

def get_float_env(env_var: str, default: float) -> float:
    """Convert environment variable to float with error handling"""
    try:
        return float(os.getenv(env_var, str(default)))
    except ValueError:
        print(f"Warning: Invalid float value for {env_var}, using default: {default}")
        return default

# Configuration settings
config = {
    # OpenAI API Configuration
    'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
    'MODEL_NAME': os.getenv('MODEL_NAME', 'gpt-3.5-turbo'),
    'MAX_TOKENS': get_int_env('MAX_TOKENS', 2000),
    'TEMPERATURE': get_float_env('TEMPERATURE', 0.7),
    
    # Data Configuration
    'DATA_PATH': os.getenv('DATA_PATH', 'data/products.json'),
    
    # Server Configuration - Using port 5000
    'HOST': os.getenv('HOST', '0.0.0.0'),
    'PORT': get_int_env('PORT', 5000),  # Back to port 5000
    'DEBUG': get_bool_env('DEBUG', True),
    
    # Cache Configuration
    'CACHE_ENABLED': get_bool_env('CACHE_ENABLED', True),
    'CACHE_TTL': get_int_env('CACHE_TTL', 3600),  # 1 hour
    
    # Recommendation Configuration
    'DEFAULT_RECOMMENDATION_COUNT': get_int_env('DEFAULT_RECOMMENDATION_COUNT', 5),
    'MAX_PRODUCTS_IN_PROMPT': get_int_env('MAX_PRODUCTS_IN_PROMPT', 20),
    'MIN_CONFIDENCE_SCORE': get_float_env('MIN_CONFIDENCE_SCORE', 0.3),
}

# Validation
def validate_config():
    """Basic configuration validation"""
    issues = []
    
    if not config['OPENAI_API_KEY']:
        issues.append("OPENAI_API_KEY is required - please set it in your .env file")
    
    if not os.path.exists(config['DATA_PATH']):
        issues.append(f"Product data file not found: {config['DATA_PATH']}")
    
    if config['MAX_TOKENS'] <= 0:
        issues.append("MAX_TOKENS must be greater than 0")
    
    if not 0 <= config['TEMPERATURE'] <= 2:
        issues.append("TEMPERATURE must be between 0 and 2")
    
    return issues

# Run validation
validation_issues = validate_config()
if validation_issues:
    print("Configuration Issues Found:")
    for issue in validation_issues:
        print(f"  - {issue}")
    print("\nPlease check your .env file configuration.")
    
    if not config['DEBUG']:
        raise ValueError("Configuration validation failed")

# Create .env template if it doesn't exist
def create_env_template():
    """Create a template .env file"""
    env_content = """# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-3.5-turbo
MAX_TOKENS=2000
TEMPERATURE=0.7

# Server Configuration - Using port 5000
HOST=0.0.0.0
PORT=5000
DEBUG=true

# Data Configuration
DATA_PATH=data/products.json

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=3600
"""
    
    if not os.path.exists('.env'):
        try:
            with open('.env.example', 'w') as f:
                f.write(env_content)
            print("Created .env.example file. Copy it to .env and add your API key.")
        except Exception as e:
            print(f"Could not create .env.example: {e}")

# Create template on import (only in development)
if config['DEBUG']:
    create_env_template()