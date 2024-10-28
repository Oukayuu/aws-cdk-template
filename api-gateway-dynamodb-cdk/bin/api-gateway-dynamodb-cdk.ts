#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayToDynamodbCdkStack } from '../lib/api-gateway-dynamodb-cdk-stack';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const app = new cdk.App();
// スタックを作成
new ApiGatewayToDynamodbCdkStack(app, 'ApiGatewayDynamodbCdkStack', {
  dynamoTableProps: {
    tableName: 'reservation-table', // テーブル名、デフォルトは `Reservations`
    partitionKey: {
      name: 'reservationId', // パーティションキー名、デフォルトは `reservationId`
      type: dynamodb.AttributeType.STRING // パーティションキーの型、デフォルトは `STRING`
    },
  },
  apiGatewayProps: {
    restApiName: 'reservation-api-gateway', // API Gateway の名前、デフォルトは `reservation-api-gateway`
  },
  resourceName: 'reservations', // リソース名、デフォルトは `reservations`
  subResourceName: '{reservationId}', // サブリソース名、デフォルトは `{reservationId}`
});