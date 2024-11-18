#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamodbStreamLambdaCdkStack } from '../lib/dynamodb-stream-lambda-cdk-stack';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';

const app = new cdk.App();
new DynamodbStreamLambdaCdkStack(app, 'DynamodbStreamLambdaCdkStack', {
  // DynamoDBテーブルのプロパティを指定
  dynamoTableProps: {
    tableName: 'reservation-table', // テーブル名、デフォルトは `Reservations`
    partitionKey: {
      name: 'reservationId', // パーティションキー名、デフォルトは `reservationId`
      type: dynamodb.AttributeType.STRING // パーティションキーの型、デフォルトは `STRING`
    },
  },
  // Lambda関数のプロパティを指定
  executeFunctionLambdaProps: {
    functionName: 'reservation-execution-function', // 関数名、デフォルトは `ReservationExecution`
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'handler',
    entry: 'lambda/reservation-execution/index.ts', // ソースコードのエントリーポイントを指定
  },
  schedulerControllerLambdaProps: {
    functionName: 'scheduler-controller-function', // 関数名、デフォルトは `SchedulerController`
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'handler',
    entry: 'lambda/scheduler-controller/index.ts', // ソースコードのエントリーポイントを指定
  },
  // スタック名を指定
  reservationStackName: {
    dbStackName: 'ReservationDbStack',
    lambdaStackName: 'ReservationLambdaStack',
    scheduleGroupStackName: 'ReservationScheduleGroupStack',
  },
  // スケジュールグループ名を指定
  scheduleGroupName: 'reservation-scheduler-group',
}); 