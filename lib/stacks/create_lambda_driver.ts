import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';

export interface MyStackProps extends cdk.StackProps {
  s3BucketArn: string;
  s3BucketName: string;
  apiUrl: string;
}


export class CreateLambdaDriver extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);
    
    // an s3 bucket to store the lambda handler
    const bucket = s3.Bucket.fromBucketName(this, "codebucket", 
      "cs6620-cdk-hw4-store-lambdacode0408")

    const func = new lambda.Function(this, 'driver', {
      functionName: "cdk_lambda_driver",
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromBucket(bucket, "driver.zip"),
      environment: {'BUCKET_NAME': props.s3BucketName, 'API_URL':props.apiUrl},
      timeout:cdk.Duration.minutes(3),
    });

    func.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.ALLOW,
      resources: [ props.s3BucketArn, props.s3BucketArn+'/*' ],
    }))

    
  }
}
