from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """
        Initialize application when Django starts.
        
        This method is called once when Django loads the application.
        In development mode with auto-reload, it may be called twice,
        but the signal registration function has safeguards against this.
        """
        try:
            # Import signals module to trigger @receiver decorators
            from api import signals
            
            # Call registration function (has built-in duplicate prevention)
            signals.register_audit_signals()
            
            logger.info("API app ready: Audit signals registered")
        except Exception as e:
            logger.error(f"Failed to register audit signals: {e}")
            # Don't raise - allow app to start even if signals fail
            # This prevents the entire application from crashing
