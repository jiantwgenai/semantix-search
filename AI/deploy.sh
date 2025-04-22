#!/bin/bash

# AWS Deployment Script for Document Search Application

# Configuration
REGION="us-east-1"
STACK_NAME="document-search-stack"
ENVIRONMENT="production"
INSTANCE_TYPE="t2.micro"
DB_INSTANCE_CLASS="db.t3.micro"
DB_NAME="documentsearch"
DB_USER="docadmin"
DB_PASSWORD="ChangeThisPassword123!"
BUCKET_NAME="document-search-files-$(date +%s)"
DOMAIN_NAME="documents.yourdomain.com"

# Function to check AWS CLI installation
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

# Function to check Node.js installation
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "Node.js is not installed. Please install it first."
        exit 1
    fi
}

# Function to create S3 bucket
create_s3_bucket() {
    echo "Creating S3 bucket: $BUCKET_NAME"
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    
    # Configure CORS
    cat > cors.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": []
        }
    ]
}
EOF
    
    aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file://cors.json
    rm cors.json
}

# Function to create RDS instance
create_rds_instance() {
    echo "Creating RDS instance..."
    aws rds create-db-instance \
        --db-name "$DB_NAME" \
        --db-instance-identifier "documentsearch-db" \
        --db-instance-class "$DB_INSTANCE_CLASS" \
        --engine postgres \
        --master-username "$DB_USER" \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --region "$REGION"
    
    # Wait for instance to be available
    echo "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier "documentsearch-db"
}

# Function to create EC2 instance
create_ec2_instance() {
    echo "Creating EC2 instance..."
    
    # Create user data script
    cat > userdata.sh << EOF
#!/bin/bash
sudo apt update
sudo apt install -y nodejs npm
sudo npm install -g pm2
EOF
    
    aws ec2 run-instances \
        --image-id ami-0c55b159cbfafe1f0 \
        --count 1 \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "document-search-key" \
        --security-groups "document-search-sg" \
        --user-data file://userdata.sh \
        --region "$REGION"
    
    rm userdata.sh
}

# Function to build and deploy backend
deploy_backend() {
    echo "Building backend..."
    cd backend
    npm install
    npm run build
    
    # Create .env file
    cat > .env << EOF
# Server
PORT=3001
NODE_ENV=$ENVIRONMENT

# Database
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# AWS
AWS_BUCKET_NAME=$BUCKET_NAME
AWS_REGION=$REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Embedding Service
EMBEDDING_API_URL=http://localhost:5000
LLAMA_MODEL=llama2
EOF
    
    # Deploy to EC2
    echo "Deploying backend to EC2..."
    # Add your EC2 deployment commands here
    
    cd ..
}

# Function to build and deploy frontend
deploy_frontend() {
    echo "Building frontend..."
    cd semantix-document-search
    npm install
    npm run build
    
    # Create .env file
    cat > .env << EOF
REACT_APP_API_URL=https://$DOMAIN_NAME
REACT_APP_S3_BUCKET=$BUCKET_NAME
REACT_APP_REGION=$REGION
EOF
    
    # Deploy to S3
    echo "Deploying frontend to S3..."
    aws s3 sync build/ "s3://$BUCKET_NAME"
    
    cd ..
}

# Main deployment process
main() {
    # Check prerequisites
    check_aws_cli
    check_nodejs
    
    echo "Starting deployment process..."
    
    # Create S3 bucket
    create_s3_bucket
    
    # Create RDS instance
    create_rds_instance
    
    # Create EC2 instance
    create_ec2_instance
    
    # Deploy backend
    deploy_backend
    
    # Deploy frontend
    deploy_frontend
    
    echo "Deployment completed successfully!"
}

# Start the deployment
main 