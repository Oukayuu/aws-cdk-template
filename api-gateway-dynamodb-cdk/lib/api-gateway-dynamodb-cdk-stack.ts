import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiGatewayToDynamoDBConstruct, IApiGatewayToDynamoDBProps } from './api-gateway-dynamodb-construct';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

/**
 * ApiGatewayToDynamodbCdkStackで使用するプロパティのインターフェース
 */
export interface ApiGatewayToDynamoDBStackProps extends IApiGatewayToDynamoDBProps {}

/**
 * API GatewayとDynamoDBを接続するCDKスタック
 */
export class ApiGatewayToDynamodbCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ApiGatewayToDynamoDBStackProps) {
    super(scope, id, props);

    new ApiGatewayToDynamoDBConstruct(this, 'ApiGatewayToDynamoDB', {
      dynamoTableProps: {
        tableName: 'reservation-table', // テーブル名、デフォルトは `Reservations`
        partitionKey: {
          name: 'reservationId', // パーティションキー名、デフォルトは `reservationId`
          type: dynamodb.AttributeType.STRING // パーティションキーの型、デフォルトは `STRING`
        },
      },
      apiGatewayProps: {
        restApiName: 'reservation-api-gateway', // API Gateway の名前、デフォルトは `reservation-api-gateway`
      },
      resourceName: 'reservations', // リソース名、デフォルトは `reservations`
      subResourceName: '{reservationId}', // サブリソース名、デフォルトは `{reservationId}`
    });
  }
}