import json
import boto3
import logging
import time
import os

logs_client = boto3.client('logs')

LOG_GROUP_NAME = f"/aws/lambda/{os.environ['AWS_LAMBDA_FUNCTION_NAME']}"

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    print(event)
    for record in event['Records']:
        # Parse the SQS body field, which contains the SNS message
        sns_message = json.loads(record['body'])
        # Extract the Message field from SNS, which contains the S3 event
        s3_event = json.loads(sns_message['Message'])
        
        # Log the parsed event structure
        logger.info(f"Parsed S3 event: {json.dumps(s3_event)}")
        
        for s3_record in s3_event.get('Records', []):
            event_name = s3_record['eventName']
            object_key = s3_record['s3']['object']['key']

            if event_name.startswith('ObjectCreated'):
                size = s3_record['s3']['object']['size']
                log_msg = {
                    "object_name": object_key,
                    "size_delta": size
                }
                logger.info(json.dumps(log_msg))

            elif event_name.startswith('ObjectRemoved'):
                size = get_previous_size(object_key)
                if size is not None:
                    log_msg = {
                        "object_name": object_key,
                        "size_delta": -size
                    }
                    logger.info(json.dumps(log_msg))
                else:
                    logger.warning(f"Size for deleted object {object_key} not found.")

def get_previous_size(object_key):
    try:
        # Search for log events from the past 5 days (this period can be adjusted)
        now = int(time.time())
        ten_minute = 10 * 60
        start_time = now - ten_minute

        response = logs_client.filter_log_events(
            logGroupName=LOG_GROUP_NAME,
            filterPattern=f'{{ $.object_name = "{object_key}" }}',  # Filter for log events containing the object key
            startTime=start_time,
            limit=20  # Limit to the most recent 5 events
        )
        
        events = response.get('events', [])
        if events:
            # Sort by timestamp and take the most recent event
            latest_event = max(events, key=lambda x: x['timestamp'])
    

            message = latest_event.get('message', '')


            try:
                # Split by tab and extract the final segment (JSON payload)
                log_parts = message.split("\t")  # Split on tabs
                json_string = log_parts[-1].strip()  # Take the last segment and trim spaces
    
                # Parse JSON payload
                parsed_message = json.loads(json_string)
    
                # Verify object_name matches object_key
                if parsed_message.get('object_name') == object_key:
                    size = parsed_message.get('size_delta')
                    if isinstance(size, int) and size > 0:
                        return size
            except json.JSONDecodeError as json_err:
                logger.error(f"Error parsing message: {message}, error: {json_err}")

    except Exception as e:
        logger.error(f"Error retrieving size for {object_key}: {str(e)}")
    
    return None
