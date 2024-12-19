import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamodbStreamLambdaSchedulerConstruct } from "./dynamodb-stream-lambda-scheduler-construct";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";

/**
 * DynamodbStreamLambdaCdkStackで使用するプロパティのインターフェース
 */
export interface IDynamodbStreamLambdaSchedulerCdkStackProps
  extends cdk.StackProps {}

/**
 * DynamoDBストリームをトリガーにしてLambdaを呼び出すCDKスタック
 */
export class DynamodbStreamLambdaSchedulerCdkStack extends cdk.Stack {
  /**
   * コンストラクタ
   * @param scope コンストラクトのスコープ
   * @param id スタックのID
   * @param props スタックのプロパティ
   */
  constructor(
    scope: Construct,
    id: string,
    props: IDynamodbStreamLambdaSchedulerCdkStackProps
  ) {
    super(scope, id, props);

    new DynamodbStreamLambdaSchedulerConstruct(
      this,
      "DynamodbStreamLambdaSchedulerConstruct",
      {
        dynamoTableProps: {
          tableName: "reservation-table",
          partitionKey: {
            name: "reservationId",
            type: dynamodb.AttributeType.STRING,
          },
        },
        schedulerControllerLambdaProps: {
          functionName: "reservation-controller",
          entry: "lambda/reservation-controller/index.ts",
          handler: "handler",
          runtime: lambda.Runtime.NODEJS_20_X,
        },
        executeFunctionLambdaProps: {
          functionName: "reservation-execution",
          entry: "lambda/reservation-execution/index.ts",
          handler: "handler",
          runtime: lambda.Runtime.NODEJS_20_X,
        },
        scheduleGroupName: "reservation-scheduler-group",
      }
    );
  }
}
