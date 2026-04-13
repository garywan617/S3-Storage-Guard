import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export interface MyStackProps extends cdk.StackProps {
  s3BucketArn: string;
  s3BucketName: string;
  dynamodbTableArn: string;
  dynamodbTableName: string;
}


export class CreateLambdaPlotting extends cdk.Stack {
  public readonly apiurl: string

  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, "codebucket", 
      "cdk-store-lambda-code-0413")
    const trackBucketName =  props.s3BucketName
    //const trackBucket = s3.Bucket.fromBucketName(this, "TrackBucket", trackBucketName);

    // Define the Lambda Layer
    const myLayer = new lambda.LayerVersion(this, 'MyLambdaLayer', {
      code: lambda.Code.fromBucket(bucket, "matplotlib-layer.zip"), // Path to layer code
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12], // Specify runtime compatibility
      compatibleArchitectures: [lambda.Architecture.X86_64],
      layerVersionName: "cdk-matplotlib-layer",
      description: 'For plotting Lambda layer'
    });

    const func = new lambda.Function(this, 'plotting', {
      functionName: "cdk_lambda_plotting",
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      architecture:lambda.Architecture.X86_64,
      code: lambda.Code.fromBucket(bucket, "plotting_lambda.zip"),
      environment: {'BUCKET_NAME': props.s3BucketName, 'TABLE_NAME':props.dynamodbTableName},
      timeout:cdk.Duration.minutes(1),
      layers: [myLayer], // Attach the layer to the function
    });

    // plot to another bucket, arn:'arn:aws:s3:::cs6620-cdk-hw4-store-lambdacode0408'
    const plot_target_arn = 'arn:aws:s3:::cs6620-cdk-hw4-store-lambdacode0408'
    func.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.ALLOW,
      resources: [ props.s3BucketArn, props.s3BucketArn+'/*', plot_target_arn, plot_target_arn+'/*'],
    }))

    func.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:*',
        'dynamodb:Query',       // Allow the Query operation
        
        ],  
      effect: iam.Effect.ALLOW,
      resources: [ props.dynamodbTableArn,
        props.dynamodbTableArn + '/index/info_size', 
      ],
    }));

    // API Gateway for Lambda trigger
    const api = new apigateway.RestApi(this, 'PlottingAPI', {
      restApiName:"cdk-plot-api",
      deployOptions: {stageName: 'test',},
    });

    const plottingResource = api.root.addResource('plot');

    // Integrate with Lambda
    const plotIntegration = new apigateway.LambdaIntegration(func);

    plottingResource.addMethod('GET', plotIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE, // Public API (change if needed)
    }); // Exposes GET /plot

    this.apiurl = api.url + "plot"

    new cdk.CfnOutput(this, 'PlotApiUrl', {
      value: this.apiurl,
      description: 'URL for the /plot endpoint',
    });
  }
}
