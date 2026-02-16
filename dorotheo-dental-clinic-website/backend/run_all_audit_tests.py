"""
Comprehensive test suite for audit optimization.
Runs all tests and generates a report.

Run: python run_all_audit_tests.py
"""
import os
import sys
import time
import subprocess

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    """Print a formatted header."""
    print(f"\n{BLUE}{'=' * 70}")
    print(f"{text:^70}")
    print(f"{'=' * 70}{RESET}\n")

def run_test(name, command):
    """Run a test and capture results."""
    print(f"\n{YELLOW}▶ Running: {name}{RESET}")
    print(f"  Command: {command}\n")
    
    start = time.time()
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    duration = time.time() - start
    
    success = result.returncode == 0
    
    if success:
        print(f"{GREEN}✓ PASSED{RESET} ({duration:.2f}s)")
    else:
        print(f"{RED}✗ FAILED{RESET} ({duration:.2f}s)")
        if result.stderr:
            print(f"\nError output:\n{result.stderr[:500]}")
    
    return success, duration, result.stdout

def main():
    """Run all audit tests."""
    print_header("AUDIT OPTIMIZATION TEST SUITE")
    
    results = []
    
    # Change to backend directory
    backend_dir = os.path.dirname(__file__)
    os.chdir(backend_dir)
    
    python_exe = os.path.join('venv', 'Scripts', 'python.exe')
    manage_py = 'manage.py'
    
    # Test 1: Verify async is enabled
    print_header("TEST 1: Verify Async Configuration")
    success, duration, output = run_test(
        "Async Configuration Check",
        f'{python_exe} test_async_enabled.py'
    )
    results.append(("Async Config", success, duration))
    if output:
        print(output[:1000])
    
    # Test 2: Middleware optimization
    print_header("TEST 2: Middleware Optimization")
    success, duration, output = run_test(
        "Middleware Filter Test",
        f'{python_exe} test_middleware_optimization.py'
    )
    results.append(("Middleware", success, duration))
    
    # Test 3: Load comparison
    print_header("TEST 3: Performance Load Test")
    success, duration, output = run_test(
        "Load Test (50 operations)",
        f'{python_exe} test_load_comparison.py'
    )
    results.append(("Load Test", success, duration))
    if output:
        print(output[:1500])
    
    # Test 4: Unit tests
    print_header("TEST 4: Performance Unit Tests")
    success, duration, output = run_test(
        "Django Unit Tests",
        f'{python_exe} {manage_py} test api.tests.test_audit_performance --keepdb'
    )
    results.append(("Unit Tests", success, duration))
    
    # Test 5: HIPAA compliance tests
    print_header("TEST 5: HIPAA Compliance Verification")
    success, duration, output = run_test(
        "Audit Logging Compliance",
        f'{python_exe} {manage_py} test api.tests.test_audit_logging --keepdb'
    )
    results.append(("HIPAA Tests", success, duration))
    
    # Generate summary report
    print_header("TEST SUMMARY")
    
    total_tests = len(results)
    passed_tests = sum(1 for _, success, _ in results if success)
    failed_tests = total_tests - passed_tests
    total_duration = sum(duration for _, _, duration in results)
    
    print(f"{'Test Name':<30} {'Status':<10} {'Duration':<10}")
    print("-" * 70)
    
    for name, success, duration in results:
        status = f"{GREEN}✓ PASS{RESET}" if success else f"{RED}✗ FAIL{RESET}"
        print(f"{name:<30} {status:<20} {duration:>6.2f}s")
    
    print("-" * 70)
    print(f"\nTotal: {total_tests} tests")
    print(f"Passed: {GREEN}{passed_tests}{RESET}")
    print(f"Failed: {RED}{failed_tests}{RESET}")
    print(f"Duration: {total_duration:.2f}s")
    
    # Final verdict
    print_header("FINAL VERDICT")
    
    if passed_tests == total_tests:
        print(f"{GREEN}🎉 ALL TESTS PASSED!{RESET}")
        print("\nAudit logging optimization is fully implemented and working correctly.")
        print("✓ Async logging enabled")
        print("✓ Performance optimized")
        print("✓ HIPAA compliance maintained")
        print("✓ Middleware filters optimized")
        return 0
    else:
        print(f"{YELLOW}⚠ SOME TESTS FAILED{RESET}")
        print(f"\n{failed_tests} test(s) need attention. Review the output above.")
        return 1

if __name__ == '__main__':
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Tests interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Error running tests: {e}{RESET}")
        sys.exit(1)
