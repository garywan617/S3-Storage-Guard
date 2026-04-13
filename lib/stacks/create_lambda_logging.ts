import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Stack } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

export interface MyStackProps extends cdk.StackProps {
  s3BucketArn: string;
  s3BucketName: string;
  loggingQueueArn: string;
}


export class CreateLambdaLogging extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, "codebucket", 
      "cs6620-cdk-hw4-store-lambdacode0408")

    const func = new lambda.Function(this, 'logging', {
      functionName: "cdk_lambda_logging",
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromBucket(bucket, "logging_lambda.zip"),
      timeout:cdk.Duration.minutes(1),
    });


    // Grant Lambda permission to access its own CloudWatch Logs (for filter_log_events)
    const region = Stack.of(func).region;
    const account = Stack.of(func).account;
    const logGroupName = `/aws/lambda/${func.functionName}`;
    const logGroupArn = `arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${func.functionName}:*`;

    func.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:FilterLogEvents',
        'logs:GetLogEvents',
        'logs:DescribeLogStreams',
        'logs:DescribeLogGroups',
        'logs:PutMetricFilter',  // Ensure Lambda has permission to put the metric filter
      ],
      effect: iam.Effect.ALLOW,
      resources: [logGroupArn],
      }));

    // Create the SQS queue event source for the Lambda function
    const loggingQueue = sqs.Queue.fromQueueArn(this, 'LoggingQueue', props.loggingQueueArn);

    // Use SqsEventSource to bind the SQS queue to Lambda
    func.addEventSource(new event_sources.SqsEventSource(loggingQueue, {
      batchSize: 10,  // Adjust the batch size as needed
    }));

    const cleanerFunc = new lambda.Function(this, 'CleanerFunction', {
      functionName: 'cdk_lambda_cleaner',
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromBucket(bucket, "cleaner_lambda.zip", "xF_uADegBtmi_y9DiWRpD9Szi5KoOsD1"),
      environment: {'BUCKET_NAME': props.s3BucketName,},
      
      timeout: cdk.Duration.seconds(10),
    });
    
    cleanerFunc.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.ALLOW,
      resources: [ props.s3BucketArn, props.s3BucketArn+'/*' ],
    }));

    // SNS Topic
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'TotalObjectSizeAlarmTopic',
    });

    // Subscribe Lambda to SNS
    alarmTopic.addSubscription(new subs.LambdaSubscription(cleanerFunc));

    // Grant SNS publish permission to the cleaner Lambda
    alarmTopic.grantPublish(cleanerFunc);

    const logGroup = logs.LogGroup.fromLogGroupName(this, 'LambdaLogGroup', logGroupName);
     
    new logs.MetricFilter(this, 'ObjectSizeDeltaMetricFilter', {
      logGroup,
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      filterPattern: logs.FilterPattern.literal('{ $.size_delta = * }'),
      metricValue: '$.size_delta',
    
    });

    // 1. Define metric
  const sizeDeltaMetric = new cloudwatch.Metric({
    namespace: 'Assignment4App',
    metricName: 'TotalObjectSize',
    statistic: 'Sum',
    period: cdk.Duration.seconds(10),
  });

  // 2. Create alarm
  const sizeDeltaAlarm = new cloudwatch.Alarm(this, 'SizeDeltaAlarm', {
    metric: sizeDeltaMetric,
    threshold: 20,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    alarmDescription: 'Triggers when TotalObjectSize sum exceeds 20 in 5 seconds.',
  });
  // Alarm Action → SNS → Lambda
  sizeDeltaAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

 


  }

    
    
}
