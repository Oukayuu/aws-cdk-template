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
    // requestIdをreservationIdに設定
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
    // reservationIdを返却するように設定
    const createIntegrationResponse = [
      {
        statusCode: "200",
        responseTemplates: {
          "application/json": '{"reservationId": "$context.requestId"}',
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

    // 登録処理のリクエストボディモデルを追加
    const createRequestBodyModel = new apigateway.Model(
      this,
      "CreateRequestBodyModel",
      {
        modelName: "CreateRequestBodyModel",
        description: "Request body for create reservation",
        restApi: construct.api,
        contentType: "application/json",
        schema: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            executeTimestamp: {
              type: apigateway.JsonSchemaType.STRING,
            },
          },
          required: ["executeTimestamp"],
        },
      }
    );

    // 登録処理のレスポンスボディモデルを追加
    const createResponseBodyModel = new apigateway.Model(
      this,
      "CreateResponseBodyModel",
      {
        modelName: "CreateResponseBodyModel",
        description: "Response body for create reservation",
        restApi: construct.api,
        contentType: "application/json",
        schema: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            reservationId: {
              type: apigateway.JsonSchemaType.STRING,
            },
          },
          required: ["reservationId"],
        },
      }
    );

    // 登録処理のメソッドレスポンス設定
    const createMethodResponse = [
      {
        statusCode: "200",
        responseModels: {
          "application/json": createResponseBodyModel,
        },
      },
      {
        statusCode: "400",
        responseModels: {
          "application/json": apigateway.Model.EMPTY_MODEL, // 4xxエラーレスポンスは空モデル（自由に設定可能）
        },
      },
    ];

    // apigatewayにメソッドを追加
    construct.setupMethod("v1/dummy/reservations", "create", {
      integrationConfig: {
        requestTemplate: createRequestTemplate,
        integrationResponse: createIntegrationResponse,
      },
      methodOptions: {
        requestModels: {
          "application/json": createRequestBodyModel,
        },
        methodResponses: createMethodResponse,
      },
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

    // メソッドを追加
    construct.setupMethod("v1/dummy/reservations/{reservationId}", "read", {
      integrationConfig: {
        requestTemplate: readRequestTemplate,
        integrationResponse: readIntegrationResponse,
      },
      methodOptions: {
        methodResponses: readMethodResponse,
      },
    });
  }
}
