import boto3
import os

s3 = boto3.client('s3')
bucket_name = os.environ.get("BUCKET_NAME")

def lambda_handler(event, context):
    THRESHOLD = 15 * 1024  # 15 KB in bytes
    
    # 1. List all objects in the bucket
    response = s3.list_objects_v2(Bucket=bucket_name)
    if 'Contents' not in response:
        print("Bucket is empty")
        return


    # 2. Calculate total bucket size
    total_size = sum(obj['Size'] for obj in response['Contents'])
    print(f"Total bucket size: {total_size} bytes ({total_size / 1024:.2f} KB)")

    if total_size <= THRESHOLD:
        print(f"Bucket size is below threshold ({total_size} bytes <= {THRESHOLD} bytes)")
        return

    # 3. If any single object is > 15 KB, delete one oversized object first
    oversized_files = [obj for obj in response['Contents'] if obj['Size'] > THRESHOLD]
    if oversized_files:
        oversized_obj = max(oversized_files, key=lambda x: x['Size'])
        s3.delete_object(Bucket=bucket_name, Key=oversized_obj['Key'])
        total_size -= oversized_obj['Size']
        print(
            f"Deleted oversized object: {oversized_obj['Key']} "
            f"(Size: {oversized_obj['Size']} bytes)"
        )
        print(f"New total bucket size: {total_size} bytes ({total_size / 1024:.2f} KB)")
        return

    # 4. Otherwise, delete LRU objects until total size is <= 15 KB
    while total_size > THRESHOLD:
        # Refresh object list to get the latest state
        response = s3.list_objects_v2(Bucket=bucket_name)
        if 'Contents' not in response or len(response['Contents']) == 0:
            print("Bucket is now empty")
            break

        # Find the least recently used object (earliest LastModified)
        lru_obj = min(response['Contents'], key=lambda x: x['LastModified'])

        # Delete the LRU object
        s3.delete_object(Bucket=bucket_name, Key=lru_obj['Key'])
        print(f"Deleted LRU object: {lru_obj['Key']} (Size: {lru_obj['Size']} bytes)")

        # Update running total size
        total_size -= lru_obj['Size']
        print(f"New total bucket size: {total_size} bytes ({total_size / 1024:.2f} KB)")

    if total_size <= THRESHOLD:
        print(f"Bucket size is now below threshold ({total_size} bytes <= {THRESHOLD} bytes)")
