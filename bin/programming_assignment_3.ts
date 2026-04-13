#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CreateS3BucketStack } from '../lib/stacks/create_s3_bucket_stack';
import { CreateDynamodbStack } from '../lib/stacks/create_dynamodb_stack';
import { CreateLambdaSizeTracking } from '../lib/stacks/create_lambda_size_tracking';
import { CreateLambdaLogging } from '../lib/stacks/create_lambda_logging';
import { CreateLambdaPlotting } from '../lib/stacks/create_lambda_plotting';
import { CreateLambdaDriver } from '../lib/stacks/create_lambda_driver';

const app = new cdk.App();
const s3Bucket = new CreateS3BucketStack(app, 'CreateS3BucketStack', {});
const bucketArn = s3Bucket.s3BucketArn;
const bucketName = s3Bucket.s3BucketName;
const for_tracking_queueArn = s3Bucket.ForTrackingQueue;
const for_logging_queueArn = s3Bucket.ForLoggingQueue;

const dynamodbTable = new CreateDynamodbStack(app, 'CreateDynamodbStack', {});
const tableArn = dynamodbTable.dynamodbTableArn;
const tableName = dynamodbTable.dynamodbTableName;

new CreateLambdaSizeTracking(app, 'CreateLambdaSizeTracking', {s3BucketArn: bucketArn, s3BucketName: bucketName, dynamodbTableArn: tableArn, dynamodbTableName: tableName, trackingQueueArn:for_tracking_queueArn});
new CreateLambdaLogging(app, 'CreateLambdaLogging', {s3BucketArn: bucketArn, s3BucketName: bucketName, loggingQueueArn:for_logging_queueArn});

const lambda_plotting = new CreateLambdaPlotting(app, 'CreateLambdaPlotting', {s3BucketArn: bucketArn, s3BucketName: bucketName, dynamodbTableArn: tableArn, dynamodbTableName: tableName});
const api_url = lambda_plotting.apiurl;
new CreateLambdaDriver(app, "CreateLambdaDriver", {s3BucketArn: bucketArn, s3BucketName: bucketName, apiUrl: api_url});
