import json
import boto3
import matplotlib.pyplot as plt
import time
from decimal import Decimal
import io
from boto3.dynamodb.conditions import Key
import logging
from botocore.exceptions import ClientError
import datetime
import os

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")
bucket_name = os.environ.get("BUCKET_NAME")
table_name = os.environ.get("TABLE_NAME")

def lambda_handler(event, context):
   
    table = dynamodb.Table(table_name)
    data = get_bucket_size_data(table)
    max_size = get_max_bucket_size(table)
    plot_data(data, max_size)

    return {
        'statusCode': 200,
        'body': json.dumps('Finished Plotting and stored in s3!')
    }
    
def get_bucket_size_data(table):
    # """Fetches bucket size records from DynamoDB for the last 60 seconds."""

    now = int(time.time())
    last_three_minute = now - 180

    response = table.query(KeyConditionExpression=Key('bucket').eq(bucket_name) & Key('time').gt(last_three_minute))
    return response["Items"]

def get_max_bucket_size(table):
    """Fetches the maximum size TestBucket has ever gotten in history."""
    response = table.query(
        IndexName='info_size',  # Using the GSI
        KeyConditionExpression=Key('bucket').eq(bucket_name),
        # KeyConditionExpression="bucket = :bucket",  # Query based on 'bucket'
        # ExpressionAttributeValues={
        #     ":bucket": {"S": "test"}  # Replace with the actual value for 'bucket'
        # },
        ProjectionExpression='info_size',  # Only retrieve the 'info_size' attribute
        ScanIndexForward=False,  # Set to False for descending order
        Limit=1  # Limit to only the first result (which will be the max value)
    )
    max_info_size = float(response['Items'][0]['info_size']) if response['Items'] else None
    
    return max_info_size

def plot_data(data, max_size):
    """Generates the plot and uploads it to S3."""
    
    time = [datetime.datetime.fromtimestamp(int(item['time'])) for item in data]
    sizes = [Decimal(item['info_size']) for item in data]
    
    plt.figure(figsize=(8, 4))
    plt.plot(time, sizes, marker='o', label='Bucket Size')
    
    if data:
        plt.xlim(min(time), max(time))
    
    plt.axhline(y=max_size, color='r', linestyle='--', label='Max Size Ever')
    plt.xlabel('Timestamp')
    plt.ylabel('Size')
    plt.legend()
    plt.title(f"Bucket Size Over Last 180s ({bucket_name})")
    
    # Save the plot to a BytesIO object (in memory)
    img_data = io.BytesIO()
    plt.savefig(img_data, format='png')
    img_data.seek(0)  # Move to the start of the BytesIO buffer
    plt.show()

    # Specify the S3 bucket name and the file name (you can use any unique name for the file)
    # store the plotting to a different bucket
    s3.upload_fileobj(img_data, "cs6620-cdk-hw4-store-lambdacode0408", "plot.png")