#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApigatewayDynamodbCdkStack } from '../lib/apigateway-dynamodb-cdk-stack';

const app = new cdk.App();
new ApigatewayDynamodbCdkStack(app, 'ApigatewayDynamodbCdkStack');
