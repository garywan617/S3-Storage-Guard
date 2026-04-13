import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';

export interface MyStackProps extends cdk.StackProps {
  s3BucketArn: string;
  s3BucketName: string;
  dynamodbTableArn: string;
  dynamodbTableName: string;
  trackingQueueArn: string;
}


export class CreateLambdaSizeTracking extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, "codebucket", 
      "cs6620-cdk-hw4-store-lambdacode0408")

    const func = new lambda.Function(this, 'sizeTrack', {
      functionName: "cdk_lambda_size_tracking",
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromBucket(bucket, "size_track_lambda.zip"),
      environment: {'BUCKET_NAME': props.s3BucketName, 'TABLE_NAME':props.dynamodbTableName},
      timeout:cdk.Duration.minutes(1),
    });

    func.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.ALLOW,
      resources: [ props.s3BucketArn, props.s3BucketArn+'/*' ],
    }));

    func.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:*'],  
      effect: iam.Effect.ALLOW,
      resources: [ props.dynamodbTableArn ],
    }));

    // Create the SQS queue event source for the Lambda function
    const trackingQueue = sqs.Queue.fromQueueArn(this, 'TrackingQueue', props.trackingQueueArn);

    // Use SqsEventSource to bind the SQS queue to Lambda
    func.addEventSource(new event_sources.SqsEventSource(trackingQueue, {
      batchSize: 10,  // Adjust the batch size as needed
    }));
  }

    
    
}
