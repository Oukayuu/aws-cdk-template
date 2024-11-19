import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { DynamodbStreamLambdaCdkStackProps } from "../../dynamodb-stream-lambda-cdk-stack";

// Lambdaを定義するCDKスタック
export class LambdaStack extends cdk.Stack {
  public readonly executeFunction: lambdaNode.NodejsFunction;
  public readonly schedulerControllerFunction: lambdaNode.NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: DynamodbStreamLambdaCdkStackProps
  ) {
    super(scope, id, props);

    // スケジューラをトリガーとするLambda関数を作成
    this.executeFunction = new lambdaNode.NodejsFunction(
      this,
      "ExecuteFunction",
      props.executeFunctionLambdaProps
    ); // Lambda関数を作成

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
  }
}
