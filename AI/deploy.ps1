# AWS Deployment Script for Document Search Application

# Configuration
$config = @{
    Region = "us-east-1"
    StackName = "document-search-stack"
    Environment = "production"
    InstanceType = "t2.micro"
    DBInstanceClass = "db.t3.micro"
    DBName = "documentsearch"
    DBUser = "docadmin"
    DBPassword = "ChangeThisPassword123!"
    BucketName = "document-search-files-$(Get-Random -Minimum 1000 -Maximum 9999)"
    DomainName = "documents.yourdomain.com"
}

# Function to check AWS CLI installation
function Test-AWSCLI {
    try {
        aws --version
        return $true
    }
    catch {
        Write-Host "AWS CLI is not installed. Please install it first."
        return $false
    }
}

# Function to check Node.js installation
function Test-NodeJS {
    try {
        node --version
        return $true
    }
    catch {
        Write-Host "Node.js is not installed. Please install it first."
        return $false
    }
}

# Function to create S3 bucket
function New-S3Bucket {
    param (
        [string]$BucketName,
        [string]$Region
    )
    
    Write-Host "Creating S3 bucket: $BucketName"
    aws s3api create-bucket --bucket $BucketName --region $Region
    
    # Configure CORS
    $corsConfig = @{
        "CORSRules" = @(
            @{
                "AllowedHeaders" = @("*")
                "AllowedMethods" = @("GET", "PUT", "POST", "DELETE")
                "AllowedOrigins" = @("*")
                "ExposeHeaders" = @()
            }
        )
    } | ConvertTo-Json
    
    $corsConfig | Out-File -FilePath "cors.json"
    aws s3api put-bucket-cors --bucket $BucketName --cors-configuration file://cors.json
    Remove-Item cors.json
}

# Function to create RDS instance
function New-RDSInstance {
    param (
        [string]$DBName,
        [string]$DBUser,
        [string]$DBPassword,
        [string]$InstanceClass,
        [string]$Region
    )
    
    Write-Host "Creating RDS instance..."
    aws rds create-db-instance `
        --db-name $DBName `
        --db-instance-identifier "documentsearch-db" `
        --db-instance-class $InstanceClass `
        --engine postgres `
        --master-username $DBUser `
        --master-user-password $DBPassword `
        --allocated-storage 20 `
        --region $Region
    
    # Wait for instance to be available
    Write-Host "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier "documentsearch-db"
}

# Function to create EC2 instance
function New-EC2Instance {
    param (
        [string]$InstanceType,
        [string]$Region
    )
    
    Write-Host "Creating EC2 instance..."
    $userData = @"
#!/bin/bash
sudo apt update
sudo apt install -y nodejs npm
sudo npm install -g pm2
"@
    
    $userData | Out-File -FilePath "userdata.sh"
    
    aws ec2 run-instances `
        --image-id ami-0c55b159cbfafe1f0 `  # Ubuntu 20.04 LTS
        --count 1 `
        --instance-type $InstanceType `
        --key-name "document-search-key" `
        --security-groups "document-search-sg" `
        --user-data file://userdata.sh `
        --region $Region
    
    Remove-Item userdata.sh
}

# Function to build and deploy backend
function Deploy-Backend {
    param (
        [string]$Environment
    )
    
    Write-Host "Building backend..."
    Set-Location backend
    npm install
    npm run build
    
    # Create .env file
    $envContent = @"
# Server
PORT=3001
NODE_ENV=$Environment

# Database
DB_HOST=$($config.DBHost)
DB_PORT=5432
DB_NAME=$($config.DBName)
DB_USER=$($config.DBUser)
DB_PASSWORD=$($config.DBPassword)

# AWS
AWS_BUCKET_NAME=$($config.BucketName)
AWS_REGION=$($config.Region)
AWS_ACCESS_KEY_ID=$env:AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$env:AWS_SECRET_ACCESS_KEY

# JWT
JWT_SECRET=$(Get-Random -Minimum 1000000000 -Maximum 9999999999)

# Embedding Service
EMBEDDING_API_URL=http://localhost:5000
LLAMA_MODEL=llama2
"@
    
    $envContent | Out-File -FilePath ".env"
    
    # Deploy to EC2
    Write-Host "Deploying backend to EC2..."
    # Add your EC2 deployment commands here
    
    Set-Location ..
}

# Function to build and deploy frontend
function Deploy-Frontend {
    param (
        [string]$Environment
    )
    
    Write-Host "Building frontend..."
    Set-Location semantix-document-search
    npm install
    npm run build
    
    # Create .env file
    $envContent = @"
REACT_APP_API_URL=https://$($config.DomainName)
REACT_APP_S3_BUCKET=$($config.BucketName)
REACT_APP_REGION=$($config.Region)
"@
    
    $envContent | Out-File -FilePath ".env"
    
    # Deploy to S3
    Write-Host "Deploying frontend to S3..."
    aws s3 sync build/ s3://$($config.BucketName)
    
    Set-Location ..
}

# Main deployment process
function Start-Deployment {
    # Check prerequisites
    if (-not (Test-AWSCLI)) { return }
    if (-not (Test-NodeJS)) { return }
    
    Write-Host "Starting deployment process..."
    
    # Create S3 bucket
    New-S3Bucket -BucketName $config.BucketName -Region $config.Region
    
    # Create RDS instance
    New-RDSInstance `
        -DBName $config.DBName `
        -DBUser $config.DBUser `
        -DBPassword $config.DBPassword `
        -InstanceClass $config.DBInstanceClass `
        -Region $config.Region
    
    # Create EC2 instance
    New-EC2Instance -InstanceType $config.InstanceType -Region $config.Region
    
    # Deploy backend
    Deploy-Backend -Environment $config.Environment
    
    # Deploy frontend
    Deploy-Frontend -Environment $config.Environment
    
    Write-Host "Deployment completed successfully!"
}

# Start the deployment
Start-Deployment 