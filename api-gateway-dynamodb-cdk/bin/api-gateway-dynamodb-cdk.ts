#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayToDynamodbCdkStack } from '../lib/api-gateway-dynamodb-cdk-stack';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const app = new cdk.App();
new ApiGatewayToDynamodbCdkStack(app, 'ApiGatewayDynamodbCdkStack', {
  dynamoTableProps: {
    tableName: 'reservation-table',
    partitionKey: {
      name: 'reservationId',
      type: dynamodb.AttributeType.STRING
    },
  },
  apiGatewayProps: {
    restApiName: 'reservation-api-gateway',
  },
  resourceName: 'reservations',
  subResourceName: '{reservationId}',
});