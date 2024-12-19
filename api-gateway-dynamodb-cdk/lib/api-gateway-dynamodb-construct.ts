import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

/**
 * ApiGatewayToDynamoDBConstructで使用するプロパティのインターフェース
 */
export interface IApiGatewayToDynamoDBProps extends cdk.StackProps {
  dynamoTableProps: dynamodb.TableProps;
  apiGatewayProps: apigateway.RestApiProps;
  apiVersion?: string;
  resourceName: string;
  subResourceName?: string;
}

/**
 * API GatewayとDynamoDBを接続するConstruct
 */
export class ApiGatewayToDynamoDBConstruct extends Construct {
  public readonly table: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  /**
   * コンストラクタ
   * @param scope コンストラクトのスコープ
   * @param id コンストラクトのID
   * @param props コンストラクトのプロパティ
   */
  constructor(scope: Construct, id: string, props: IApiGatewayToDynamoDBProps) {
    super(scope, id);

    // テーブル名が存在しない場合はエラー
    if (!props.dynamoTableProps.tableName) {
      throw new Error("Table name must be provided in dynamoTableProps");
    }

    // API Gatewayの名前が存在しない場合はエラー
    if (!props.apiGatewayProps.restApiName) {
      throw new Error("API Gateway name must be provided in apiGatewayProps");
    }

    // DynamoDBテーブルを作成
    this.table = new dynamodb.Table(this, props.dynamoTableProps.tableName, {
      partitionKey: {
        name: props.dynamoTableProps.partitionKey.name,
        type: props.dynamoTableProps.partitionKey.type,
      },
      tableName: props.dynamoTableProps.tableName,
    });

    // API Gatewayの作成
    const api = new apigateway.RestApi(
      this,
      props.apiGatewayProps.restApiName,
      {
        restApiName: props.apiGatewayProps.restApiName,
        deployOptions: {
          // ステージ名を指定
          stageName: "dev",
        },
      }
    );

    // ルートリソースの作成
    const resource = api.root.addResource(props.resourceName);

    // サブリソースの作成
    const subResource = resource.addResource(
      props.subResourceName || "{reservationId}"
    );

    // IAMロールの作成
    const apiGatewayRole = new iam.Role(this, "ApiGatewayRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // DynamoDBへのアクセス権限をIAMロールに付与
    this.table.grantReadWriteData(apiGatewayRole);

    // 登録のPOSTメソッドの定義
    const postIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "PutItem",
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          "application/json": `{
         "TableName": "${this.table.tableName}",
         "Item": {
           "reservationId": {
             "S": "$context.requestId"
           },
           "executeTimestamp": {
             "S": $input.json('$.executeTimestamp')
           }
         }
       }`,
        },
        integrationResponses: [
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
      },
    });

    // 定義したPOSTメソッドをAPI Gatewayに追加
    resource.addMethod("POST", postIntegration, {
      methodResponses: [
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
    });

    // 個別照会のGETメソッドの定義
    const getIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "GetItem",
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          "application/json": `{
           "TableName": "${this.table.tableName}",
           "Key": {
             "reservationId": {
               "S": "$input.params('reservationId')"
             }
           }
         }`,
        },
        integrationResponses: [
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
      },
    });

    // 定義したGETメソッドをAPI Gatewayのサブリソースに追加
    subResource.addMethod("GET", getIntegration, {
      methodResponses: [
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
    });

    // 一覧取得のGETメソッドの定義
    const scanIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "Scan",
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          "application/json": `{
           "TableName": "${this.table.tableName}"
         }`,
        },
        integrationResponses: [
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
      },
    });

    // 定義したGETメソッドをAPI Gatewayのリソースに追加
    resource.addMethod("GET", scanIntegration, {
      methodResponses: [
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
    });

    // 更新PUTメソッドの定義
    const updateIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "UpdateItem",
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          "application/json": `{
           "TableName": "${this.table.tableName}",
           "Key": {
             "reservationId": {
               "S": "$input.params('reservationId')"
             }
           },
           "UpdateExpression": "set executeTimestamp = :executeTimestamp",
           "ExpressionAttributeValues": {
             ":executeTimestamp": {
               "S": $input.json('$.executeTimestamp')
             }
           }
         }`,
        },
        integrationResponses: [
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
      },
    });

    // 定義したPUTメソッドをAPI Gatewayのサブリソースに追加
    subResource.addMethod("PUT", updateIntegration, {
      methodResponses: [
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
    });

    // DELETEメソッドの定義
    const deleteIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "DeleteItem",
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          "application/json": `{
           "TableName": "${this.table.tableName}",
           "Key": {
             "reservationId": {
               "S": "$input.params('reservationId')"
             }
           }
         }`,
        },
        integrationResponses: [
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
      },
    });

    // 定義したDELETEメソッドをAPI Gatewayのサブリソースに追加
    subResource.addMethod("DELETE", deleteIntegration, {
      methodResponses: [
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
    });
  }
}
