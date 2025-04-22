# Test registration endpoint
Write-Host "Testing registration endpoint..."
$body = @{
    email = "test@example.com"
    password = "test123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Body $body -ContentType "application/json"
Write-Host "Registration response:"
$response | ConvertTo-Json

# Test login endpoint with correct password
Write-Host "Testing login endpoint..."
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $body -ContentType "application/json"
Write-Host "Login response:"
$response | ConvertTo-Json 