import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';



export class CreateS3BucketStack extends cdk.Stack {
  public readonly s3BucketArn: string
  public readonly s3BucketName: string
  public readonly ForTrackingQueue: string
  public readonly ForLoggingQueue: string

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create an s3 bucket
    const bucket = new s3.Bucket(this, 'MyBucket', {
      bucketName: 'cdk-store-bucket-0413',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    this.s3BucketArn = bucket.bucketArn
    this.s3BucketName = bucket.bucketName

    // create sns topic
    const topic = new sns.Topic(this, 'GuardTopic', {
      topicName: "GuardTopic",
    });

    // Set up an S3 event notification to trigger the Lambda function
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(topic));
    bucket.addEventNotification(s3.EventType.OBJECT_REMOVED, new s3n.SnsDestination(topic));
  
    // create for tracking queue
    const for_tracking_queue = new sqs.Queue(this, 'ForTrackingQueue', {
      queueName: "ForTracking",
      visibilityTimeout:cdk.Duration.minutes(1)
    });
    this.ForTrackingQueue = for_tracking_queue.queueArn

    // create for logging queue
    const for_logging_queue = new sqs.Queue(this, 'ForLoggingQueue', {
      queueName: "ForLogging",
      visibilityTimeout:cdk.Duration.minutes(1)
    });

    this.ForLoggingQueue = for_logging_queue.queueArn

    topic.addSubscription(new subscriptions.SqsSubscription(for_tracking_queue));

    topic.addSubscription(new subscriptions.SqsSubscription(for_logging_queue));
  }
}
