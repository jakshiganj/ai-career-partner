import logging
import sys
import os

def setup_logging():
    """Configures the global logging settings."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Create a standard formatter
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates on reload
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    root_logger.addHandler(handler)

def get_logger(name: str):
    """Returns a logger instance with the given name."""
    return logging.getLogger(name)
