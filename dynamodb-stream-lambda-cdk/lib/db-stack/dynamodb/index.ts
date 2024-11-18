import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// 本スタック使用するinterfaceを定義
export interface DynamodbStreamLambdaCdkStackProps extends cdk.StackProps {
  dynamoTableProps: dynamodb.TableProps;
}

export class DynamodbCdkStack extends cdk.Stack {

  public readonly dynamoTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamodbStreamLambdaCdkStackProps) {
    super(scope, id, props);

    // テーブル名が存在しない場合はエラー
    if (!props.dynamoTableProps.tableName) {
      throw new Error("Table name must be provided in dynamoTableProps");
    }

    // dynamodb tableを作成
    this.dynamoTable = new dynamodb.Table(this, props.dynamoTableProps.tableName, {
      partitionKey: {
        name: props.dynamoTableProps.partitionKey.name,
        type: props.dynamoTableProps.partitionKey.type,
      },
      tableName: props.dynamoTableProps.tableName,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にテーブルも削除
    });

  }
}