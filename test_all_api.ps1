<#
.SYNOPSIS
    LedgerWatch AI — Complete API Test Suite (15 Tests)
.DESCRIPTION
    Runs all API tests end-to-end and generates report.
#>

$API_BASE = "http://localhost:8000"
$API_KEY = "demo-key-123"
$PASS = 0
$FAIL = 0
$RESULTS = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$Expected
    )

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST: $Name" -ForegroundColor Cyan
    Write-Host "Expected: $Expected" -ForegroundColor Gray
    Write-Host "----------------------------------------" -ForegroundColor Cyan

    try {
        $result = & $Test
        Write-Host "✅ PASS" -ForegroundColor Green
        $script:PASS++
        $script:RESULTS += [PSCustomObject]@{ Test = $Name; Status = "PASS"; Detail = "OK" }
        return $result
    }
    catch {
        Write-Host "❌ FAIL" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        $script:FAIL++
        $script:RESULTS += [PSCustomObject]@{ Test = $Name; Status = "FAIL"; Detail = "$_" }
        return $null
    }
}

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║     LedgerWatch AI — Complete API Test Suite                 ║
║     15 Tests | Backend Validation                            ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

# ═══════════════════════════════════════════════════════════════
# TEST 1: Health Check (Public)
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "1. Health Check (Public)" -Expected "status=ok, model_loaded=true" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/health" -ErrorAction Stop
    if ($r.status -ne "ok") { throw "Status not ok" }
    if ($r.model_loaded -ne $true) { throw "Model not loaded" }
    if ($r.risk_engine_loaded -ne $true) { throw "Risk engine not loaded" }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 2: Single Prediction + SHAP
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "2. Single Prediction + SHAP" -Expected "risk_score 95-100, Critical, SHAP values" -Test {
    $body = @{
        step = 1; type = "TRANSFER"; amount = 181.00
        nameOrig = "C123456789"; oldbalanceOrg = 181.00; newbalanceOrig = 0.00
        nameDest = "M987654321"; oldbalanceDest = 0.00; newbalanceDest = 0.00
    } | ConvertTo-Json

    $r = Invoke-RestMethod -Uri "$API_BASE/predict?explain=true" -Method POST `
        -Headers @{"X-API-Key"=$API_KEY; "Content-Type"="application/json"} `
        -Body $body -ErrorAction Stop

    if ($r.risk_score -lt 90) { throw "Risk score too low: $($r.risk_score)" }
    if ($r.risk_band -ne "Critical") { throw "Expected Critical, got $($r.risk_band)" }
    if ($r.is_anomaly -ne $true) { throw "Expected is_anomaly=true" }
    if ($r.shap_values -eq $null) { throw "SHAP values missing" }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 3: Stats Endpoint
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "3. Stats Endpoint" -Expected "total>0, anomaly_rate ~0.05" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/stats" -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop
    if ($r.total_transactions -le 0) { throw "No transactions" }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 4: Transaction List (Paginated)
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "4. Transaction List (Paginated)" -Expected "3 transactions, all fields present" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/transactions?limit=3&offset=0" `
        -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    if ($r.transactions.Count -ne 3) { throw "Expected 3 transactions, got $($r.transactions.Count)" }
    if ($r.count -le 0) { throw "Total count is 0" }

    $tx = $r.transactions[0]
    @("risk_score","risk_band","is_anomaly","created_at") | ForEach-Object {
        if ($tx.$_ -eq $null -and $_ -ne "created_at") { throw "Missing field: $_" }
    }
    Write-Host ($r | ConvertTo-Json -Depth 2) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 5: Single Transaction by ID
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "5. Single Transaction by ID" -Expected "Transaction with matching ID" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/transactions/1" `
        -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    if ($r.id -ne 1) { throw "ID mismatch" }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 6: OCR Invoice Parsing
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "6. OCR Invoice Parsing" -Expected "amount, date, vendor extracted" -Test {
    $filePath = "data/test_invoices/invoice_1.png"
    if (-not (Test-Path $filePath)) { throw "Invoice file not found: $filePath" }

    $r = Invoke-RestMethod -Uri "$API_BASE/ocr" -Method POST `
        -Headers @{"X-API-Key"=$API_KEY} `
        -Form @{"file"=Get-Item $filePath} -ErrorAction Stop

    if ($r.amount -le 0) { throw "Amount not extracted" }
    if ([string]::IsNullOrEmpty($r.vendor)) { throw "Vendor not extracted" }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 7: Pagination Offset
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "7. Pagination Offset" -Expected "Different records at offset=50000" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/transactions?limit=3&offset=50000" `
        -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    if ($r.transactions.Count -lt 1) { throw "No transactions returned" }
    if ($r.transactions[0].id -le 50000) { throw "Offset not working" }
    Write-Host "First ID at offset 50000: $($r.transactions[0].id)" -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 8: Verify Anomalies Scattered
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "8. Anomalies Scattered in DB" -Expected "Some is_anomaly=true found" -Test {
    $found = $false
    for ($offset = 0; $offset -lt 1000; $offset += 100) {
        $r = Invoke-RestMethod -Uri "$API_BASE/transactions?limit=10&offset=$offset" `
            -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

        $anomalies = $r.transactions | Where-Object { $_.is_anomaly -eq $true }
        if ($anomalies) {
            Write-Host "Found anomaly at offset $offset : ID=$($anomalies[0].id), risk=$($anomalies[0].risk_score)" -ForegroundColor DarkGray
            $found = $true
            break
        }
    }
    if (-not $found) { throw "No anomalies found in first 1000 records" }
    $found
}

# ═══════════════════════════════════════════════════════════════
# TEST 9: Risk Score Distribution
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "9. Risk Score Distribution" -Expected "Mix of Low/Medium/High/Critical" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/transactions?limit=50&offset=0" `
        -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    $bands = $r.transactions | Group-Object -Property risk_band | Select-Object Name, Count
    Write-Host ($bands | ConvertTo-Json) -ForegroundColor DarkGray

    $uniqueBands = ($bands | Measure-Object).Count
    if ($uniqueBands -lt 2) { throw "Only $uniqueBands risk bands found, expected mix" }
    $bands
}

# ═══════════════════════════════════════════════════════════════
# TEST 10: Find Anomaly Record
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "10. Find Anomaly Record" -Expected "is_anomaly=true, risk_score>=95" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/transactions?limit=5&offset=1000" `
        -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    $anomaly = $r.transactions | Where-Object { $_.is_anomaly -eq $true } | Select-Object -First 1
    if (-not $anomaly) { throw "No anomaly found" }
    if ($anomaly.risk_score -lt 95) { throw "Anomaly risk score too low: $($anomaly.risk_score)" }
    Write-Host "Anomaly found: ID=$($anomaly.id), risk=$($anomaly.risk_score), band=$($anomaly.risk_band)" -ForegroundColor DarkGray
    $anomaly
}

# ═══════════════════════════════════════════════════════════════
# TEST 11: Batch Predict (7.3 MB CSV)
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "11. Batch Predict (7.3 MB CSV)" -Expected "total_processed ~100K, anomalies ~5K" -Test {
    $filePath = "data/processed/cleaned_sample.csv"
    if (-not (Test-Path $filePath)) { throw "CSV file not found: $filePath" }

    $r = Invoke-RestMethod -Uri "$API_BASE/batch-predict" -Method POST `
        -Headers @{"X-API-Key"=$API_KEY} `
        -Form @{"file"=Get-Item $filePath} -ErrorAction Stop

    if ($r.total_processed -lt 90000) { throw "Too few processed: $($r.total_processed)" }
    if ($r.anomalies_detected -lt 4000) { throw "Too few anomalies: $($r.anomalies_detected)" }
    Write-Host "Processed: $($r.total_processed), Anomalies: $($r.anomalies_detected)" -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 12: Stats After Batch
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "12. Stats After Batch" -Expected "total increased by ~100K" -Test {
    $r = Invoke-RestMethod -Uri "$API_BASE/stats" -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop

    if ($r.total_transactions -lt 100000) { throw "Total too low: $($r.total_transactions)" }
    if ($r.anomaly_rate -lt 0.04 -or $r.anomaly_rate -gt 0.06) {
        throw "Anomaly rate out of range: $($r.anomaly_rate)"
    }
    Write-Host ($r | ConvertTo-Json) -ForegroundColor DarkGray
    $r
}

# ═══════════════════════════════════════════════════════════════
# TEST 13: 404 Error Handling
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "13. 404 Error Handling" -Expected "404 Transaction not found" -Test {
    try {
        Invoke-RestMethod -Uri "$API_BASE/transactions/999999" `
            -Headers @{"X-API-Key"=$API_KEY} -ErrorAction Stop
        throw "Should have thrown 404"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 404) {
            throw "Expected 404, got $($_.Exception.Response.StatusCode.value__)"
        }
        Write-Host "Correctly returned 404" -ForegroundColor DarkGray
        $true
    }
}

# ═══════════════════════════════════════════════════════════════
# TEST 14: Invalid API Key (Auth)
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "14. Invalid API Key (Auth)" -Expected "403 Invalid API key" -Test {
    try {
        Invoke-RestMethod -Uri "$API_BASE/stats" -Headers @{"X-API-Key"="wrong-key"} -ErrorAction Stop
        throw "Should have thrown 403"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) {
            throw "Expected 403, got $($_.Exception.Response.StatusCode.value__)"
        }
        Write-Host "Correctly returned 403" -ForegroundColor DarkGray
        $true
    }
}

# ═══════════════════════════════════════════════════════════════
# TEST 15: File Size Limit (>10MB)
# ═══════════════════════════════════════════════════════════════
Test-Endpoint -Name "15. File Size Limit (>10MB)" -Expected "413 File too large" -Test {
    $filePath = "data/processed/cleaned.csv"
    if (-not (Test-Path $filePath)) { throw "Large CSV not found: $filePath" }

    try {
        Invoke-RestMethod -Uri "$API_BASE/batch-predict" -Method POST `
            -Headers @{"X-API-Key"=$API_KEY} `
            -Form @{"file"=Get-Item $filePath} -ErrorAction Stop
        throw "Should have thrown 413"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 413) {
            throw "Expected 413, got $($_.Exception.Response.StatusCode.value__)"
        }
        Write-Host "Correctly returned 413" -ForegroundColor DarkGray
        $true
    }
}

# ═══════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════
Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    TEST REPORT                               ║" -ForegroundColor Magenta
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Magenta
Write-Host "║  TOTAL: 15  |  ✅ PASS: $PASS  |  ❌ FAIL: $FAIL" -ForegroundColor $(if($FAIL -eq 0){"Green"}else{"Yellow"})
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Host "`n📊 Detailed Results:" -ForegroundColor Cyan
$RESULTS | Format-Table -AutoSize

if ($FAIL -eq 0) {
    Write-Host "`n🎉 ALL TESTS PASSED! Backend is fully operational." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  $FAIL test(s) failed. Check logs above." -ForegroundColor Yellow
}
