import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiGatewayDynamoDBConstruct } from "./apigateway-dynamodb-construct";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ApigatewayDynamodbCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new ApiGatewayDynamoDBConstruct(this, "ApiGatewayDynamoDB", {
      dynamoTableProps: {
        tableName: "reservation-table", // テーブル名、デフォルトは `Reservations`
        partitionKey: {
          name: "reservationId", // パーティションキー名、デフォルトは `reservationId`
          type: dynamodb.AttributeType.STRING, // パーティションキーの型、デフォルトは `STRING`
        },
      },
      apiGatewayProps: {
        restApiName: "reservation-api-gateway", // API Gateway の名前、デフォルトは `reservation-api-gateway`
        deployOptions: {
          stageName: "dev", // ステージ名を指定
        },
      },
      resourcePath: "/v2/dev/reservations/{reservationId}", // リソース名、デフォルトは `reservations`
      allowPutOperation: true,
      putOperationConfig: {
        resourceName: "reservations",
        requestTemplate: `{
          "TableName": "reservation-table",
          "Item": {
            "reservationId": {
              "S": "$context.requestId"
            },
            "executeTimestamp": {
              "S": $input.json('$.executeTimestamp')
            }
          }
        }`,
        integrationResponse: [
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
        ],
        methodResponse: [
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
        ],
      },
      allowScanOperation: true,
      scanOperationConfig: {
        resourceName: "reservations",
        requestTemplate: `{
          "TableName": "reservation-table"
        }`,
        integrationResponse: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `#set($inputRoot = $input.path('$'))
                    {
                      "items": [
                        #foreach($item in $inputRoot.Items)
                          {
                            "reservationId": "$item.reservationId.S",
                            "executeTimestamp": "$item.executeTimestamp.S"
                          }#if($foreach.hasNext),#end
                        #end
                      ]
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
        ],
        methodResponse: [
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
        ],
      },
      allowGetOperation: true,
      getOperationConfig: {
        resourceName: "{reservationId}",
        requestTemplate: `{
          "TableName": "reservation-table",
          "Key": {
            "reservationId": {
              "S": "$input.params('reservationId')"
            }
          }
        }`,
        integrationResponse: [
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
        ],
        methodResponse: [
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
        ],
      },
      allowUpdateOperation: true,
      updateOperationConfig: {
        resourceName: "{reservationId}",
        requestTemplate: `{
          "TableName": "reservation-table",
          "Key": {
            "reservationId": {
              "S": "$input.params('reservationId')"
            }
          },
          "UpdateExpression": "SET executeTimestamp = :executeTimestamp",
          "ExpressionAttributeValues": {
            ":executeTimestamp": {
              "S": $input.json('$.executeTimestamp')
            }
          }
        }`,
        integrationResponse: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"message": "Item updated successfully"}',
            },
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}", // 4xxエラーをキャッチ
            responseTemplates: {
              "application/json": '{"message": "Bad Request"}',
            },
          },
        ],
        methodResponse: [
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
        ],
      },
      allowDeleteOperation: true,
      deleteOperationConfig: {
        resourceName: "{reservationId}",
        requestTemplate: `{
          "TableName": "reservation-table",
          "Key": {
            "reservationId": {
              "S": "$input.params('reservationId')"
            }
          }
        }`,
        integrationResponse: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"message": "Item deleted successfully"}',
            },
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}", // 4xxエラーをキャッチ
            responseTemplates: {
              "application/json": '{"message": "Bad Request"}',
            },
          },
        ],
        methodResponse: [
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
        ],
      },
    });
  }
}
