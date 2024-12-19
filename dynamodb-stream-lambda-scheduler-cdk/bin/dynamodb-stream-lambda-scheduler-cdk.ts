#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DynamodbStreamLambdaSchedulerCdkStack } from "../lib/dynamodb-stream-lambda-scheduler-cdk-stack";

const app = new cdk.App();

// スタックを作成
new DynamodbStreamLambdaSchedulerCdkStack(
  app,
  "DynamodbStreamLambdaSchedulerCdkStack",
  {}
);
