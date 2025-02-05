import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

/**
 * ApiGatewayToDynamoDBConstructで使用するプロパティのインターフェース
 */
export interface IApiGatewayDynamodbProps extends cdk.StackProps {
  /** DynamoDBテーブルのプロパティ */
  dynamoTableProps: dynamodb.TableProps;
  /** API Gatewayのプロパティ */
  apiGatewayProps: apigateway.RestApiProps;
}

/**
 * メソッドconfigのインターフェース
 */
export interface IMethodConfig {
  requestTemplate: string;
  integrationResponse?: apigateway.IntegrationResponse[];
  methodResponse?: apigateway.MethodResponse[];
}

/**
 * HTTPメソッドのタイプ定義
 */
export type MethodType = "GET" | "POST" | "PUT" | "DELETE";

/**
 * 操作のタイプエイリアス
 */
export type OperationType = "create" | "read" | "list" | "update" | "delete";

/**
 * DynamoDBアクションのタイプエイリアス
 */
export type DynamodbActionType =
  | "PutItem"
  | "GetItem"
  | "Scan"
  | "UpdateItem"
  | "DeleteItem";

/**
 * OperationとHTTPメソッド、DynamoDBアクションのマッピング
 */
const methodMap: {
  [key in OperationType]: { Method: MethodType; Action: DynamodbActionType };
} = {
  create: {
    Method: "POST",
    Action: "PutItem",
  },
  read: {
    Method: "GET",
    Action: "GetItem",
  },
  list: {
    Method: "GET",
    Action: "Scan",
  },
  update: {
    Method: "PUT",
    Action: "UpdateItem",
  },
  delete: {
    Method: "DELETE",
    Action: "DeleteItem",
  },
};

/**
 * API GatewayとDynamoDBを接続するConstruct
 */
export class ApiGatewayDynamoDBConstruct extends Construct {
  public readonly table: dynamodb.Table;
  public readonly api: apigateway.RestApi;
  private readonly _apiGatewayRole: iam.Role;

  /**
   * コンストラクタ
   * @param scope コンストラクトのスコープ
   * @param id コンストラクトのID
   * @param props コンストラクタのプロパティ
   */
  constructor(scope: Construct, id: string, props: IApiGatewayDynamodbProps) {
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
    this.table = new dynamodb.Table(
      this,
      props.dynamoTableProps.tableName,
      props.dynamoTableProps
    );

    // API Gatewayの作成
    this.api = new apigateway.RestApi(
      this,
      props.apiGatewayProps.restApiName,
      props.apiGatewayProps
    );

    // IAMロールの作成
    this._apiGatewayRole = new iam.Role(this, "ApiGatewayRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // DynamoDBへのアクセス権限をIAMロールに付与
    this.table.grantReadWriteData(this._apiGatewayRole);
  }

  /**
   * メソッドを設定する
   * @param resource API Gatewayのリソース
   * @param operation 操作の種類
   * @param methodConfig メソッドの設定プロパティ
   */
  public setupMethod(
    resource: apigateway.IResource,
    operation: OperationType,
    methodConfig: IMethodConfig
  ): void {
    // resourceがこのクラスから生成されたものであることを確認
    if (resource.api !== this.api) {
      throw new Error(
        "Resource must belong to the current API instance"
      );
    }

    // リソースに紐つくメソッドはすでに存在すればエラー
    resource.node.children.forEach((child) => {
      if (child instanceof apigateway.Method) {
        if (child.httpMethod === methodMap[operation].Method) {
          throw new Error(
            `Method ${methodMap[operation].Method} already exists on this resource`
          );
        }
      }
    });

    const { Method, Action } = methodMap[operation];

    const createIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: Action,
      options: {
        credentialsRole: this._apiGatewayRole,
        requestTemplates: {
          "application/json": methodConfig.requestTemplate,
        },
        integrationResponses: methodConfig.integrationResponse,
      },
    });

    resource.addMethod(Method, createIntegration, {
      methodResponses: methodConfig.methodResponse,
    });
  }
}