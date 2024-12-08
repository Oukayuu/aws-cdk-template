#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayToDynamodbCdkStack } from '../lib/api-gateway-dynamodb-cdk-stack';

const app = new cdk.App();
// スタックを作成
new ApiGatewayToDynamodbCdkStack(app, 'ApiGatewayDynamodbCdkStack');