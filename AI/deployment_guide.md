# AWS Deployment Guide

## 1. Infrastructure Requirements

### AWS Services Needed:
- **EC2**: For running the Node.js backend
- **RDS**: PostgreSQL database with pgvector extension
- **S3**: For document storage
- **Elastic Beanstalk** (Optional): For easier deployment management
- **Route 53**: For domain management
- **CloudFront**: For CDN and SSL termination
- **IAM**: For service permissions

## 2. Deployment Steps

### A. Database Setup
1. Create RDS PostgreSQL instance:
   ```bash
   # Enable pgvector extension
   CREATE EXTENSION vector;
   ```
2. Configure security groups to allow access from EC2
3. Update database connection string in `.env`:
   ```
   DB_HOST=your-rds-endpoint
   DB_PORT=5432
   DB_NAME=your-db-name
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   ```

### B. S3 Setup
1. Create S3 bucket for document storage
2. Configure CORS policy:
   ```json
   {
     "CORSRules": [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
         "AllowedOrigins": ["your-frontend-domain"],
         "ExposeHeaders": []
       }
     ]
   }
   ```
3. Update S3 configuration in `.env`:
   ```
   AWS_BUCKET_NAME=your-bucket-name
   AWS_REGION=your-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

### C. Backend Deployment
1. Build the backend:
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. Create EC2 instance:
   - Ubuntu 20.04 LTS
   - t2.micro (minimum)
   - Security group with ports 3001 (backend) and 22 (SSH) open

3. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   sudo npm install -g pm2
   ```

4. Deploy backend:
   ```bash
   # Copy files to EC2
   scp -r backend/* ubuntu@your-ec2-ip:/home/ubuntu/app/
   
   # Start application with PM2
   pm2 start dist/app.js --name "document-search-backend"
   pm2 save
   ```

### D. Frontend Deployment
1. Build the frontend:
   ```bash
   cd semantix-document-search
   npm install
   npm run build
   ```

2. Deploy to S3:
   ```bash
   # Configure S3 bucket for static website hosting
   aws s3 sync build/ s3://your-frontend-bucket
   ```

3. Set up CloudFront:
   - Create distribution
   - Point to S3 bucket
   - Configure SSL certificate
   - Set up custom domain

## 3. Environment Configuration

### Backend .env
```env
# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# AWS
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# JWT
JWT_SECRET=your-jwt-secret

# Embedding Service
EMBEDDING_API_URL=your-embedding-service-url
LLAMA_MODEL=llama2
```

### Frontend .env
```env
REACT_APP_API_URL=https://your-backend-domain
REACT_APP_S3_BUCKET=your-bucket-name
REACT_APP_REGION=your-region
```

## 4. Security Considerations

1. **IAM Roles**:
   - Create specific roles for EC2 and RDS
   - Use least privilege principle
   - Rotate credentials regularly

2. **Network Security**:
   - Use VPC for all resources
   - Configure security groups
   - Enable VPC Flow Logs

3. **Data Protection**:
   - Enable encryption at rest
   - Use SSL/TLS for all connections
   - Regular backups

4. **Monitoring**:
   - Set up CloudWatch alarms
   - Enable RDS Performance Insights
   - Monitor S3 access logs

## 5. Scaling Considerations

1. **Horizontal Scaling**:
   - Use EC2 Auto Scaling Group
   - Configure load balancer
   - Implement session management

2. **Database Scaling**:
   - Enable RDS read replicas
   - Configure connection pooling
   - Monitor query performance

3. **Storage Scaling**:
   - Implement S3 lifecycle policies
   - Use CloudFront for caching
   - Monitor storage usage

## 6. Maintenance

1. **Updates**:
   - Regular security patches
   - Database maintenance windows
   - Application version updates

2. **Backups**:
   - Automated RDS snapshots
   - S3 versioning
   - Regular backup testing

3. **Monitoring**:
   - Set up CloudWatch dashboards
   - Configure alerts
   - Regular log analysis

## 7. Cost Optimization

1. **Resource Sizing**:
   - Right-size EC2 instances
   - Use reserved instances
   - Monitor and adjust capacity

2. **Storage Optimization**:
   - Implement S3 lifecycle rules
   - Use S3 Intelligent-Tiering
   - Regular cleanup of old files

3. **Network Optimization**:
   - Use CloudFront caching
   - Optimize S3 transfer
   - Monitor data transfer costs

## 8. Troubleshooting

1. **Common Issues**:
   - Database connection problems
   - S3 access issues
   - JWT token validation
   - CORS configuration

2. **Logging**:
   - CloudWatch Logs
   - Application logs
   - Database logs

3. **Monitoring Tools**:
   - CloudWatch Metrics
   - RDS Performance Insights
   - S3 access logs 