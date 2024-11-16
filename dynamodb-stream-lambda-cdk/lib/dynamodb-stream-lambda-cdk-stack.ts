import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { aws_scheduler as scheduler } from 'aws-cdk-lib';

// 本スタック使用するinterfaceを定義
export interface DynamodbStreamLambdaCdkStackProps extends cdk.StackProps {
  dynamoTableProps: dynamodb.TableProps;
}

export class DynamodbStreamLambdaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DynamodbStreamLambdaCdkStackProps) {
    super(scope, id, props);

    // テーブル名が存在しない場合はエラー
    if (!props.dynamoTableProps.tableName) {
      throw new Error("Table name must be provided in dynamoTableProps");
    }

    // dynamodb tableを作成
    const table = new dynamodb.Table(this, props.dynamoTableProps.tableName, {
      partitionKey: {
        name: props.dynamoTableProps.partitionKey.name,
        type: props.dynamoTableProps.partitionKey.type,
      },
      tableName: props.dynamoTableProps.tableName,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にテーブルも削除
    });

    // スケジューラをトリガーとするLambda関数を作成
    const executeFunction = new lambdaNode.NodejsFunction(this, 'ExecuteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'lambda/reservation-execution/index.ts', // ソースコードのエントリーポイントを指定
    });

    // 実行関数にDynamoDBテーブルへのアクセス権限を付与
    table.grantReadWriteData(executeFunction);

    // 信頼ポリシーにEventBridge Schedulerを追加
    (executeFunction.role as iam.Role).assumeRolePolicy?.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('scheduler.amazonaws.com')],
      actions: ['sts:AssumeRole']
    }));

    // スケジュールを作成するLambda関数を作成
    const schedulerControllerFunction = new lambdaNode.NodejsFunction(this, 'SchedulerControllerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'lambda/scheduler-controller/index.ts', // ソースコードのエントリーポイントを指定
      environment: {
        EXECUTE_FUNCTION_ARN: executeFunction.functionArn,
        EXECUTE_FUNCTION_ROLE: executeFunction.role?.roleArn || ''
      }
    });

    // EventBridgeへのアクセス権限をLambda関数に付与
    schedulerControllerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'scheduler:CreateSchedule',
        'scheduler:DeleteSchedule',
        'scheduler:UpdateSchedule',
        'scheduler:ListSchedules'
      ],
      resources: ['*'],
    }));

    // schedulerControllerFunctionにiam:PassRole権限を付与
    const passRolePolicy = new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [executeFunction.role?.roleArn || ''],
    });
    schedulerControllerFunction.addToRolePolicy(passRolePolicy);

    // DynamoDBストリームをトリガーにしてLambdaを呼び出す
    schedulerControllerFunction.addEventSource(new lambdaEventSources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));

    new scheduler.CfnScheduleGroup(this, 'ReservationScheduleGroup', {
      name: 'reservation-scheduler-group'
    });
  }
}