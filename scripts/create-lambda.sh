#!/bin/bash

# Проверяем наличие необходимых переменных окружения
if [ -z "$AWS_REGION" ]; then
    echo "Error: AWS region not set"
    exit 1
fi

# Параметры
ENV=$1
REGION=$2
FUNCTION_NAME="playwright-test-$ENV"

if [ -z "$ENV" ] || [ -z "$REGION" ]; then
    echo "Usage: ./create-lambda.sh <env> <region>"
    echo "Example: ./create-lambda.sh stage us-east-1"
    exit 1
fi

# Проверяем существование функции
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo "Function $FUNCTION_NAME already exists in region $REGION"
    exit 0
fi

# Используем существующую роль
ROLE_ARN="arn:aws:iam::015722374928:role/AWSReservedSSO_Developer_57e371c2541a8c58"

# Создаем Lambda функцию
echo "Creating Lambda function $FUNCTION_NAME in region $REGION..."
aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --handler index.handler \
    --role $ROLE_ARN \
    --memory-size 1024 \
    --timeout 300 \
    --environment "Variables={TEST_ENV=$ENV,AWS_LAMBDA_FUNCTION_NAME=$FUNCTION_NAME,REGION=$REGION}" \
    --zip-file fileb://lambda-function.zip \
    --region $REGION

echo "Lambda function created successfully!" 