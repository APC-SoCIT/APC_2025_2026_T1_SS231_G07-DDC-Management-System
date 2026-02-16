#!/usr/bin/env python
"""
Quick runner for async vs sync audit logging performance test.

This script runs the specific benchmark that compares:
- Synchronous audit logging (baseline)
- Asynchronous audit logging with ThreadPoolExecutor

Expected Result: Async should be 5-50x faster due to fire-and-forget behavior.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from django.test.runner import DiscoverRunner
from django.conf import settings

# Ensure test database is used
settings.DATABASES['default']['NAME'] = ':memory:'

def run_async_performance_test():
    """Run only the async logging performance comparison test."""
    
    print("\n" + "="*70)
    print("🚀 AUDIT LOG PERFORMANCE BENCHMARK: SYNC vs ASYNC")
    print("="*70)
    print("\nThis test compares synchronous vs asynchronous audit logging.")
    print("Async logging uses ThreadPoolExecutor to offload DB writes to")
    print("background threads, allowing HTTP responses to return immediately.\n")
    
    # Run specific test
    runner = DiscoverRunner(verbosity=2, keepdb=True)
    
    # Run just the comparison test
    test_labels = [
        'api.tests.test_audit_performance.AsyncLoggingPerformanceTest.test_sync_vs_async_comparison_50_logs'
    ]
    
    failures = runner.run_tests(test_labels)
    
    if failures == 0:
        print("\n" + "="*70)
        print("✅ PERFORMANCE TEST PASSED")
        print("="*70)
        print("\n📝 Summary:")
        print("   - Async logging successfully offloads DB writes to background")
        print("   - HTTP responses return immediately (no blocking)")
        print("   - System performance improved significantly")
        print("="*70)
    else:
        print("\n" + "="*70)
        print("❌ PERFORMANCE TEST FAILED")
        print("="*70)
        print("\nCheck the output above for details.")
    
    return failures

if __name__ == '__main__':
    sys.exit(run_async_performance_test())
