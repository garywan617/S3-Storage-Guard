import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class CreateDynamodbStack extends cdk.Stack {
  public readonly dynamodbTableArn: string
  public readonly dynamodbTableName: string

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'MyTable', {
      tableName: 'cdktable0413',
      partitionKey: {
          name: 'bucket',
          type: dynamodb.AttributeType.STRING
      },
      sortKey: {
          name: 'time',
          type: dynamodb.AttributeType.NUMBER
      },
      //billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 10,
      writeCapacity: 10,
      removalPolicy: cdk.RemovalPolicy.DESTROY
  });

  table.addGlobalSecondaryIndex({
      indexName: 'info_size',
      partitionKey: {
          name: 'bucket',
          type: dynamodb.AttributeType.STRING
      },
      sortKey: {
          name: 'info_size',
          type: dynamodb.AttributeType.NUMBER
      },
      //projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: 10,
      writeCapacity: 10
  });

  this.dynamodbTableArn = table.tableArn
  this.dynamodbTableName = table.tableName
}
}
