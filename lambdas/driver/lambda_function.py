import json
import boto3
import time 
import requests
import os


def progress_bar(seconds):
    """Shows a simple progress bar in the command window."""
    for _ in range(seconds):
        time.sleep(1)
        

def lambda_handler(event, context):

    bucket_name = os.environ.get("BUCKET_NAME")
    api_url = os.environ.get("API_URL")

    s3 = boto3.client("s3")

    # Create object assignment1.txt
    s3.put_object(Bucket=bucket_name, Key="test1.txt", Body="Empty test 1")
    progress_bar(10)
    print("Created test1.txt with content: 'Empty test 1'")

    # Create object assignmen2.txt
    s3.put_object(Bucket=bucket_name, Key="test2.txt", Body="test 2222222222")
    progress_bar(10)
    print("Created test2.txt with content: 'test 2222222222'")

    # Create object assignmen3.txt
    s3.put_object(Bucket=bucket_name, Key="test3.txt", Body="33")
    progress_bar(30)
    print("Created test3.txt with content: '33'")

    response = requests.get(api_url)
    print(api_url)

    return {
        'statusCode': 200,
        'body': json.dumps('Completed!')
    }
