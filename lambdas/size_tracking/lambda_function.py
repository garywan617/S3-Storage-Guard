import json
import boto3
import time
from decimal import Decimal
import os

def lambda_handler(event, context):
    
    bucket_name = os.environ.get("BUCKET_NAME")
    table_name = os.environ.get("TABLE_NAME")
    

    # Initialize S3 and DynamoDB resources
    s3 = boto3.resource("s3")
    # s3 = boto3.client("s3")
    dynamodb = boto3.resource("dynamodb")

    bucket = s3.Bucket(bucket_name)

    total_size = 0
    total_number_objects = 0

    objects = list(bucket.objects.all())
    
    for o in objects:
        total_size += o.size
        total_number_objects += 1
    
    table = dynamodb.Table(table_name)
    table.put_item(
                Item={
                    "bucket": bucket_name,
                    "time": int(time.time()),
                    "info_size": Decimal(str(total_size)),
                    "number_of_objects": Decimal(total_number_objects),
                }
            )
    print("Add an item into dynamodb")