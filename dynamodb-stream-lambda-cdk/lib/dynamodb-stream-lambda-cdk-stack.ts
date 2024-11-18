import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { aws_scheduler as scheduler } from 'aws-cdk-lib';
import { DynamodbCdkStack } from './db-stack/dynamodb';
import { LambdaStack } from './app-stack/lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';

// 本スタック使用するinterfaceを定義
export interface DynamodbStreamLambdaCdkStackProps extends cdk.StackProps {
  dynamoTableProps: dynamodb.TableProps;
  schedulerControllerLambdaProps:  lambdaNode.NodejsFunctionProps;
  executeFunctionLambdaProps: lambdaNode.NodejsFunctionProps;
  reservationStackName: {
    dbStackName: string;
    lambdaStackName: string;
    scheduleGroupStackName: string;
  };
  scheduleGroupName: string;
}

export class DynamodbStreamLambdaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DynamodbStreamLambdaCdkStackProps) {
    super(scope, id, props);

    // DynamoDBテーブルを作成
    const tableStack = new DynamodbCdkStack(this, props.reservationStackName.dbStackName, props);
    const reservationTable = tableStack.dynamoTable;

    // Lambdaを作成する
    const lambdaStack = new LambdaStack(this, props.reservationStackName.lambdaStackName, props);
    const { executeFunction, schedulerControllerFunction } = lambdaStack;

    // DynamoDBストリームをトリガーにしてLambdaを呼び出す
    schedulerControllerFunction.addEventSource(new lambdaEventSources.DynamoEventSource(reservationTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));

    // スケジュールグループを作成
    new scheduler.CfnScheduleGroup(this, props.reservationStackName.scheduleGroupStackName, {
      name: props.scheduleGroupName,
    });
  }
}