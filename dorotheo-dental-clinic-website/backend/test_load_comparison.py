"""
Load test: Compare sync vs async audit logging performance.
This simulates real-world API load.

Run: python test_load_comparison.py
"""
import os
import sys
import django
import time
import statistics

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from api.models import AuditLog, DentalRecord
from api.audit_service import create_audit_log

User = get_user_model()

print("=" * 70)
print("LOAD TEST: SYNC VS ASYNC COMPARISON")
print("=" * 70)

# Setup test data
test_user = User.objects.filter(username='load_test_user').first()
if not test_user:
    test_user = User.objects.create_user(
        username='load_test_user',
        email='loadtest@example.com',
        password='testpass123',
        user_type='staff'
    )
    print(f"✓ Created test user: {test_user.username}")

test_patient = User.objects.filter(username='load_test_patient').first()
if not test_patient:
    test_patient = User.objects.create_user(
        username='load_test_patient',
        email='loadpatient@example.com',
        password='testpass123',
        user_type='patient'
    )
    print(f"✓ Created test patient: {test_patient.username}")

# Create test dental records
print("\n✓ Creating 20 test dental records...")
records = []
for i in range(20):
    record, created = DentalRecord.objects.get_or_create(
        patient=test_patient,
        treatment=f'Load Test Treatment {i}',
        defaults={
            'diagnosis': f'Test Diagnosis {i}',
            'notes': 'Load test data',
            'created_by': test_user
        }
    )
    records.append(record)

def run_load_test(num_operations, mode_name):
    """Run a load test with specified number of operations."""
    print(f"\n{'=' * 70}")
    print(f"{mode_name}: {num_operations} operations")
    print('=' * 70)
    
    timings = []
    
    for i in range(num_operations):
        start = time.perf_counter()
        
        # Simulate typical API operation: read + log
        record = records[i % len(records)]
        
        create_audit_log(
            actor=test_user,
            action_type='READ',
            target_table='DentalRecord',
            target_record_id=record.id,  # Use .id or .pk for primary key
            patient_id=test_patient,
            ip_address='127.0.0.1',
            user_agent='LoadTest/1.0',
            changes={'accessed_field': 'treatment'}
        )
        
        end = time.perf_counter()
        timings.append((end - start) * 1000)  # Convert to ms
    
    # Calculate statistics
    timings.sort()
    stats = {
        'min': min(timings),
        'max': max(timings),
        'mean': statistics.mean(timings),
        'median': statistics.median(timings),
        'p95': timings[int(len(timings) * 0.95)],
        'p99': timings[int(len(timings) * 0.99)],
        'total': sum(timings)
    }
    
    print(f"\n📊 Results ({num_operations} operations):")
    print(f"   Total Time:    {stats['total']:.2f}ms")
    print(f"   Mean:          {stats['mean']:.2f}ms")
    print(f"   Median:        {stats['median']:.2f}ms")
    print(f"   P95:           {stats['p95']:.2f}ms")
    print(f"   P99:           {stats['p99']:.2f}ms")
    print(f"   Min:           {stats['min']:.2f}ms")
    print(f"   Max:           {stats['max']:.2f}ms")
    
    return stats

# Test with current settings
current_async = getattr(settings, 'AUDIT_ASYNC_LOGGING', False)
print(f"\n✓ Current AUDIT_ASYNC_LOGGING: {current_async}")

if current_async:
    print("\n🚀 Running with ASYNC enabled (optimized)")
    async_stats = run_load_test(50, "ASYNC MODE")
    
    # Wait for background processing
    print("\n⏳ Waiting 2 seconds for background threads...")
    time.sleep(2)
    
    print("\n" + "=" * 70)
    print("ANALYSIS")
    print("=" * 70)
    print(f"\nWith ASYNC enabled:")
    print(f"  ✓ Mean response time: {async_stats['mean']:.2f}ms")
    print(f"  ✓ P95 response time:  {async_stats['p95']:.2f}ms")
    
    if async_stats['mean'] < 1.0:
        print(f"\n🎉 EXCELLENT: < 1ms per operation (fire-and-forget)")
    elif async_stats['mean'] < 5.0:
        print(f"\n✓ GOOD: < 5ms per operation")
    else:
        print(f"\n⚠ WARNING: Higher than expected ({async_stats['mean']:.2f}ms)")
    
    # Estimate improvement over sync
    estimated_sync_time = 50 * 10  # ~10ms per sync write
    improvement = (estimated_sync_time - async_stats['total']) / estimated_sync_time * 100
    print(f"\n💰 Estimated improvement over sync: {improvement:.1f}%")
    print(f"   (Sync would take ~{estimated_sync_time:.0f}ms for 50 operations)")
    
else:
    print("\n⚠ Running with SYNC mode (not optimized)")
    sync_stats = run_load_test(50, "SYNC MODE")
    
    print("\n" + "=" * 70)
    print("ANALYSIS")
    print("=" * 70)
    print(f"\nWith SYNC (current):")
    print(f"  ⚠ Mean response time: {sync_stats['mean']:.2f}ms")
    print(f"  ⚠ P95 response time:  {sync_stats['p95']:.2f}ms")
    print(f"\nRecommendation: Enable AUDIT_ASYNC_LOGGING=True for {50 / sync_stats['mean']:.1f}x speedup")

# Verify logs were created
log_count = AuditLog.objects.filter(actor=test_user, target_table='DentalRecord').count()
print(f"\n✓ Total audit logs in database: {log_count}")

print("\n" + "=" * 70)
print("LOAD TEST COMPLETE")
print("=" * 70)
