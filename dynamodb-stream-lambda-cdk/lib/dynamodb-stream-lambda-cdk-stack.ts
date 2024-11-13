import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';

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

    // Lambda関数を作成
    const myFunction = new lambdaNode.NodejsFunction(this, 'MyFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'lambda/index.ts', // ソースコードのエントリーポイントを指定
    });

    // DynamoDBストリームをトリガーにしてLambdaを呼び出す
    myFunction.addEventSource(new lambdaEventSources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));
  }
}
