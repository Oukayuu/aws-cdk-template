import { StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiGatewayDynamoDBConstruct } from "./apigateway-dynamodb-construct";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";

/**
 * ApiGatewayDynamodbCdkStackクラス
 */
export class ApigatewayDynamodbCdkStack extends cdk.Stack {
  /**
   * コンストラクタ
   * @param scope コンストラクトのスコープ
   * @param id コンストラクトのID
   * @param props スタックのプロパティ
   */
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // dynamodbとapigatewayの設定propsを作成
    const dynamodbProps: dynamodb.TableProps = {
      tableName: "reservation-table",
      partitionKey: {
        name: "reservationId",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    };

    const apigatewayProps: apigateway.RestApiProps = {
      restApiName: "reservation-api-gateway",
      deployOptions: {
        stageName: "dev",
      },
    };

    // ApiGatewayDynamoDBConstructをインスタンス化
    const construct = new ApiGatewayDynamoDBConstruct(
      this,
      "ApiGatewayDynamoDB",
      {
        dynamoTableProps: dynamodbProps,
        apiGatewayProps: apigatewayProps,
      }
    );

    // 登録処理のリクエストテンプレート
    const createRequestTemplate = `{
            "TableName": "reservation-table",
            "Item": {
              "reservationId": {
                "S": "$context.requestId"
              },
              "executeTimestamp": {
                "S": $input.json('$.executeTimestamp')
              }
            }
          }`;

    // 登録処理の統合レスポンス設定
    const createIntegrationResponse = [
      {
        statusCode: "200",
        responseTemplates: {
          "application/json": '{"message": "Item added successfully"}',
        },
      },
      {
        statusCode: "400",
        selectionPattern: "4\\d{2}", // 4xxエラーをキャッチ
        responseTemplates: {
          "application/json": '{"message": "Bad Request"}',
        },
      },
    ];

    // 登録処理のメソッドレスポンス設定
    const createMethodResponse = [
      {
        statusCode: "200",
        responseModels: {
          "application/json": apigateway.Model.EMPTY_MODEL,
        },
      },
      {
        statusCode: "400",
        responseModels: {
          "application/json": apigateway.Model.EMPTY_MODEL,
        },
      },
    ];

    // apigatewayのルートリソースを取得
    const rootResource = construct.api.root;

    // リソースを追加
    const reservationsResource = rootResource
      .addResource("v1")
      .addResource("dummy")
      .addResource("reservations");

    construct.setupMethod(reservationsResource, "create", {
      requestTemplate: createRequestTemplate,
      integrationResponse: createIntegrationResponse,
      methodResponse: createMethodResponse,
    });

    // 取得処理のリクエストテンプレート
    const readRequestTemplate = `{
            "TableName": "reservation-table",
            "Key": {
              "reservationId": {
                "S": "$input.params('reservationId')"
              }
            }
          }`;

    // 取得処理の統合レスポンス設定
    const readIntegrationResponse = [
      {
        statusCode: "200",
        responseTemplates: {
          "application/json": `#set($inputRoot = $input.path('$'))
                {
                  "reservationId": "$inputRoot.Item.reservationId.S",
                  "executeTimestamp": "$inputRoot.Item.executeTimestamp.S"
                }`,
        },
      },
      {
        statusCode: "400",
        selectionPattern: "4\\d{2}", // 4xxエラーをキャッチ
        responseTemplates: {
          "application/json": '{"message": "Bad Request"}',
        },
      },
    ];

    // 取得処理のメソッドレスポンス設定
    const readMethodResponse = [
      {
        statusCode: "200",
        responseModels: {
          "application/json": apigateway.Model.EMPTY_MODEL,
        },
      },
      {
        statusCode: "400",
        responseModels: {
          "application/json": apigateway.Model.EMPTY_MODEL,
        },
      },
    ];

    // リソースを追加
    const reservationResource =
      reservationsResource.addResource("{reservationId}");

    // メソッドを設定
    construct.setupMethod(reservationResource, "read", {
      requestTemplate: readRequestTemplate,
      integrationResponse: readIntegrationResponse,
      methodResponse: readMethodResponse,
    });
  }
}
