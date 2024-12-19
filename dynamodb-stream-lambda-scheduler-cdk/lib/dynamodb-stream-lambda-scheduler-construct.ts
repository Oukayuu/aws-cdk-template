import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import { aws_scheduler as scheduler } from "aws-cdk-lib";

/**
 * DynamodbStreamLambdaConstructで使用するプロパティのインターフェース
 */
export interface IDynamodbStreamLambdaSchedulerConstructProps {
  dynamoTableProps: dynamodb.TableProps;
  schedulerControllerLambdaProps: lambdaNode.NodejsFunctionProps;
  executeFunctionLambdaProps: lambdaNode.NodejsFunctionProps;
  scheduleGroupName: string;
}

/**
 * DynamoDBストリームをトリガーにしてLambdaを呼び出すConstruct
 */
export class DynamodbStreamLambdaSchedulerConstruct extends Construct {
  public readonly dynamoTable: dynamodb.Table;
  public readonly executeFunction: lambdaNode.NodejsFunction;
  public readonly schedulerControllerFunction: lambdaNode.NodejsFunction;

  /**
   * コンストラクタ
   * @param scope コンストラクトのスコープ
   * @param id コンストラクトのID
   * @param props コンストラクトのプロパティ
   */
  constructor(
    scope: Construct,
    id: string,
    props: IDynamodbStreamLambdaSchedulerConstructProps
  ) {
    super(scope, id);

    // DynamoDBテーブルを作成
    this.dynamoTable = new dynamodb.Table(this, "ReservationTable", {
      partitionKey: {
        name: props.dynamoTableProps.partitionKey.name,
        type: props.dynamoTableProps.partitionKey.type,
      },
      tableName: props.dynamoTableProps.tableName,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にテーブルも削除
    });

    // スケジューラをトリガーとするLambda関数を作成
    this.executeFunction = new lambdaNode.NodejsFunction(
      this,
      "ExecuteFunction",
      props.executeFunctionLambdaProps
    );

    // 信頼ポリシーにEventBridge Schedulerを追加
    (this.executeFunction.role as iam.Role).assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("scheduler.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      })
    );

    // スケジュールを作成するLambda関数を作成
    this.schedulerControllerFunction = new lambdaNode.NodejsFunction(
      this,
      "SchedulerControllerFunction",
      {
        ...props.schedulerControllerLambdaProps,
        environment: {
          EXECUTE_FUNCTION_ARN: this.executeFunction.functionArn,
          EXECUTE_FUNCTION_ROLE: this.executeFunction.role?.roleArn || "",
        },
      }
    );

    // EventBridgeへのアクセス権限をLambda関数に付与
    this.schedulerControllerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "scheduler:CreateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:UpdateSchedule",
          "scheduler:ListSchedules",
        ],
        resources: ["*"],
      })
    );

    // schedulerControllerFunctionにiam:PassRole権限を付与
    const passRolePolicy = new iam.PolicyStatement({
      actions: ["iam:PassRole"],
      resources: [this.executeFunction.role?.roleArn || ""],
    });
    this.schedulerControllerFunction.addToRolePolicy(passRolePolicy);

    // DynamoDBストリームをトリガーにしてLambdaを呼び出す
    this.schedulerControllerFunction.addEventSource(
      new lambdaEventSources.DynamoEventSource(this.dynamoTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      })
    );

    // スケジュールグループを作成
    new scheduler.CfnScheduleGroup(this, "ScheduleGroup", {
      name: props.scheduleGroupName,
    });
  }
}
