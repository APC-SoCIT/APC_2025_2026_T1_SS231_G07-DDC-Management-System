"""
Custom Azure Storage backend with Cache-Control headers.

This automatically sets appropriate caching headers based on file type
to improve performance and reduce bandwidth costs.
"""
from storages.backends.azure_storage import AzureStorage


class CachedAzureStorage(AzureStorage):
    """
    Azure Blob Storage backend with intelligent Cache-Control headers.
    
    Cache policies:
    - Profile pictures: 1 day (public)
    - Patient files/documents: 1 hour (private, HIPAA-sensitive)
    - Medical images: 2 hours (private, HIPAA-sensitive)
    - Service images: 1 day (public)
    - Invoices/billing: 1 hour (private, sensitive)
    """
    
    def get_object_parameters(self, name):
        """
        Set cache control based on file path/type.
        
        Args:
            name: The blob name/path
            
        Returns:
            dict: Azure blob parameters including CacheControl
        """
        params = super().get_object_parameters(name) or {}
        
        # Profile pictures - public, 1 day cache
        if name.startswith('profiles/'):
            params['CacheControl'] = 'public, max-age=86400'
        
        # Patient medical files - private (HIPAA), 1 hour cache
        elif name.startswith(('documents/', 'patient_files/')):
            params['CacheControl'] = 'private, max-age=3600'
        
        # Dental/teeth images - private (HIPAA), 2 hours cache
        elif name.startswith('teeth_images/'):
            params['CacheControl'] = 'private, max-age=7200'
        
        # Invoices and billing - private (sensitive), 1 hour cache
        elif name.startswith(('invoices/', 'billing/')):
            params['CacheControl'] = 'private, max-age=3600'
        
        # Service images (non-sensitive) - public, 1 day cache
        elif name.startswith('services/'):
            params['CacheControl'] = 'public, max-age=86400'
        
        # Default - moderate caching for public content
        else:
            params['CacheControl'] = 'public, max-age=3600'
        
        return params
