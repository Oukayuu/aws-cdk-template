#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamodbStreamLambdaCdkStack } from '../lib/dynamodb-stream-lambda-cdk-stack';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const app = new cdk.App();
new DynamodbStreamLambdaCdkStack(app, 'DynamodbStreamLambdaCdkStack', {
  dynamoTableProps: {
    tableName: 'reservation-table', // テーブル名、デフォルトは `Reservations`
    partitionKey: {
      name: 'reservationId', // パーティションキー名、デフォルトは `reservationId`
      type: dynamodb.AttributeType.STRING // パーティションキーの型、デフォルトは `STRING`
    },
  }
}); 