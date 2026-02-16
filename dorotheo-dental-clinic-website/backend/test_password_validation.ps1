# Password Validation Test Script
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " Password Validation Test Suite" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:8000/api/register/"
$script:testResults = @()

function Test-Registration {
    param(
        [string]$TestName,
        [string]$Password,
        [string]$Username,
        [bool]$ShouldSucceed
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    Write-Host "Password: '$Password'" -ForegroundColor Gray
    
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $testUser = if ($Username) { $Username } else { "testuser$timestamp" }
    
    $body = @{
        username = $testUser
        email = "$testUser@example.com"
        first_name = "Test"
        last_name = "User"
        password = $Password
        confirm_password = $Password
        user_type = "patient"
        phone = "1234567890"
        address = "123 Test St"
        birthday = "2000-01-01"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
        
        if ($ShouldSucceed) {
            Write-Host "PASS: Registration succeeded" -ForegroundColor Green
            $script:testResults += @{ Test = $TestName; Result = "PASS"; Message = "Registration succeeded" }
        } else {
            Write-Host "FAIL: Registration succeeded (should have failed)" -ForegroundColor Red
            $script:testResults += @{ Test = $TestName; Result = "FAIL"; Message = "Should have failed" }
        }
    }
    catch {
        $errorMessage = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        $errorDetails = $null
        if ($_.ErrorDetails.Message) { 
            $errorDetails = try { $_.ErrorDetails.Message | ConvertFrom-Json } catch { $null } 
        }
        
        if (-not $ShouldSucceed) {
            Write-Host "PASS: Registration rejected" -ForegroundColor Green
            if ($errorDetails -and $errorDetails.password) {
                Write-Host "  Errors:" -ForegroundColor Cyan
                foreach ($err in $errorDetails.password) { Write-Host "    - $err" -ForegroundColor DarkCyan }
                $script:testResults += @{ Test = $TestName; Result = "PASS"; Message = ($errorDetails.password -join '; ') }
            } else {
                $script:testResults += @{ Test = $TestName; Result = "PASS"; Message = "Rejected" }
            }
        } else {
            Write-Host "FAIL: Registration rejected (should have succeeded)" -ForegroundColor Red
            $script:testResults += @{ Test = $TestName; Result = "FAIL"; Message = $errorMessage }
        }
    }
    Write-Host ""
}

# Test 1: Very weak password - too short
Test-Registration -TestName "Test 1: Very weak password (123)" -Password "123" -ShouldSucceed $false

# Test 2: Common weak password
Test-Registration -TestName "Test 2: Common weak password (password)" -Password "password" -ShouldSucceed $false

# Test 3: Numeric-only password
Test-Registration -TestName "Test 3: Numeric-only password (12345678)" -Password "12345678" -ShouldSucceed $false

# Test 4: Password similar to username
$similarUser = "johndoe$(Get-Date -Format 'HHmmss')"
Test-Registration -TestName "Test 4: Password similar to username" -Password $similarUser -Username $similarUser -ShouldSucceed $false

# Test 5: Password similar to email (first part)
$emailUser = "testuser$(Get-Date -Format 'HHmmss')"
Test-Registration -TestName "Test 5: Password similar to email" -Password $emailUser -Username "$emailUser" -ShouldSucceed $false

# Test 6: Strong password - should succeed
Test-Registration -TestName "Test 6: Strong password" -Password "Correct-Horse-Battery-Staple-99!" -ShouldSucceed $true

# Test 7: Another strong password variation
Test-Registration -TestName "Test 7: Strong password variation" -Password "SecureP@ssw0rd2024!" -ShouldSucceed $true

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = ($script:testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($script:testResults | Where-Object { $_.Result -eq "FAIL" }).Count

foreach ($result in $script:testResults) {
    $color = if ($result.Result -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$($result.Result): $($result.Test)" -ForegroundColor $color
    Write-Host "  $($result.Message)" -ForegroundColor Gray
}

Write-Host "`nTotal: $($script:testResults.Count) tests" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""
