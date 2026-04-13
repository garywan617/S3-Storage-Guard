# S3 Storage Guard

A comprehensive AWS CDK project that monitors and manages S3 bucket storage with multiple Lambda functions for tracking, logging, plotting, and cleaning up files.

## Project Overview

This project deploys the following AWS resources:
- **S3 Bucket**: Primary storage bucket for monitoring
- **DynamoDB Table**: Stores bucket size metrics and history
- **Lambda Functions**:
  - `size_tracking`: Tracks current bucket size and stores metrics in DynamoDB
  - `logging`: Logs S3 object creation/deletion events with size changes
  - `plotting`: Generates visualization of bucket size trends over time
  - `cleaner`: Automatically removes files when bucket exceeds size threshold (15 KB)
  - `driver`: Orchestrates the system by creating test objects and triggering workflows
- **SNS Topic & SQS Queues**: Event routing for S3 notifications
- **CloudWatch**: Monitoring and alerting

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- AWS CLI configured with credentials (`~/.aws/credentials`)
- AWS CDK CLI: `npm install -g aws-cdk`
- Python 3.13 (for Lambda functions)
- Appropriate AWS permissions (S3, Lambda, DynamoDB, IAM, CloudWatch)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Prepare Lambda Functions - Package and Upload to S3

Before deploying, you need to zip the Lambda Python files and upload them to an S3 bucket:

```bash
# Create a temporary directory for packaging
mkdir -p /tmp/lambda_packages

# Package each Lambda function
cd lambdas/driver
zip -r /tmp/lambda_packages/driver.zip lambda_function.py certifi/ charset_normalizer/ idna/ requests/ urllib3/
cd ../logging
zip -r /tmp/lambda_packages/logging_lambda.zip lambda_function.py
cd ../plotting
zip -r /tmp/lambda_packages/plotting_lambda.zip lambda_function.py
cd ../cleaner
zip -r /tmp/lambda_packages/cleaner_lambda.zip lambda_function.py
cd ../size_tracking
zip -r /tmp/lambda_packages/size_tracking_lambda.zip lambda_function.py

# Create S3 bucket for Lambda code (note: bucket name must be globally unique)
aws s3 mb s3://cdk-store-lambda-code-0413 --region us-east-1

# Upload all zipped Lambda functions to the S3 bucket
aws s3 cp /tmp/lambda_packages/driver.zip s3://cdk-store-lambda-code-0413/driver.zip
aws s3 cp /tmp/lambda_packages/logging_lambda.zip s3://cdk-store-lambda-code-0413/logging_lambda.zip
aws s3 cp /tmp/lambda_packages/plotting_lambda.zip s3://cdk-store-lambda-code-0413/plotting_lambda.zip
aws s3 cp /tmp/lambda_packages/cleaner_lambda.zip s3://cdk-store-lambda-code-0413/cleaner_lambda.zip
aws s3 cp /tmp/lambda_packages/size_tracking_lambda.zip s3://cdk-store-lambda-code-0413/size_tracking_lambda.zip

# Verify uploads
aws s3 ls s3://cdk-store-lambda-code-0413/
```

**Note**: If the bucket already exists, skip the `mb` command. If you want to use a different bucket name, update it in the following files:
- `lib/stacks/create_lambda_driver.ts`
- `lib/stacks/create_lambda_logging.ts`
- `lib/stacks/create_lambda_plotting.ts`
- `lib/stacks/create_lambda_size_tracking.ts`

### 3. Build the CDK Project

```bash
npm run build
```

### 4. (Optional) Bootstrap AWS Environment

If this is your first time deploying CDK to this AWS account/region:

```bash
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

### 5. Deploy the Stack

```bash
npx cdk deploy
```

The deploy command will show a summary of resources being created. Review and confirm by typing `y` when prompted.

## Usage

After deployment, the system will:

1. **Monitor S3 Bucket**: The `size_tracking` Lambda runs periodically to capture bucket metrics
2. **Log Events**: The `logging` Lambda processes S3 object creation/deletion events
3. **Generate Reports**: The `plotting` Lambda creates visualizations stored in S3
4. **Auto-Clean**: The `cleaner` Lambda automatically removes old files if bucket size exceeds 15 KB
5. **Drive Workflows**: The `driver` Lambda creates test objects and triggers the monitoring pipeline

### Viewing Logs

```bash
# View Lambda function logs
aws logs tail /aws/lambda/cdk_lambda_driver --follow
aws logs tail /aws/lambda/cdk_lambda_logging --follow
aws logs tail /aws/lambda/cdk_lambda_plotting --follow
```

### Checking DynamoDB Records

```bash
aws dynamodb scan --table-name cdktable0413
```

### Retrieving Generated Plots

```bash
aws s3 cp s3://cdk-store-lambda-code-0413/plot.png ./plot.png
```

## Useful Commands

- `npm run build`     - Compile TypeScript to JavaScript
- `npm run watch`     - Watch for changes and compile automatically
- `npm run test`      - Run Jest unit tests
- `npx cdk deploy`    - Deploy stack to AWS
- `npx cdk diff`      - Compare deployed stack with current code
- `npx cdk destroy`   - Delete the stack and all resources (warning: this removes all data)
- `npx cdk synth`     - Generate CloudFormation template

## Cleanup

To delete all resources when done:

```bash
# Destroy the CDK stack
npx cdk destroy

# Remove Lambda code from S3 (if keeping the bucket)
aws s3 rm s3://cdk-store-lambda-code-0413 --recursive

# Delete the Lambda code bucket (if you want to remove it completely)
aws s3 rb s3://cdk-store-lambda-code-0413 --force
```

## Project Structure

```
.
├── bin/                               # Entry point
│   └── programming_assignment_3.ts   # CDK app definition
├── lib/stacks/                        # Stack definitions
│   ├── create_s3_bucket_stack.ts
│   ├── create_dynamodb_stack.ts
│   ├── create_lambda_*.ts
│   └── ...
├── lambdas/                           # Lambda function source code
│   ├── driver/                        # Main orchestrator
│   ├── logging/                       # Event logging
│   ├── plotting/                      # Visualization
│   ├── cleaner/                       # Automatic cleanup
│   └── size_tracking/                 # Metrics collection
├── test/                              # Unit tests
├── cdk.json                           # CDK configuration
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript configuration
```

## Troubleshooting

- **Bucket name already exists**: S3 bucket names are globally unique. Modify the bucket name in `create_s3_bucket_stack.ts` and Lambda stack files.
- **Insufficient permissions**: Ensure your AWS credentials have access to S3, Lambda, DynamoDB, IAM, and CloudWatch
- **Lambda timeout**: Functions are configured with appropriate timeouts; adjust in stack files if needed
- **Size threshold not working**: The cleaner Lambda uses a 15 KB threshold; modify in `cleaner/lambda_function.py`

## Support

For more information on AWS CDK, visit: https://docs.aws.amazon.com/cdk/
