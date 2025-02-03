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
  /** リソースパス */
  resourcePath: string;
  /** PUT操作を許可するかどうか */
  allowPutOperation: boolean;
  /** PUT操作の設定 */
  putOperationConfig?: {
    resourceName: string;
    requestTemplate: string;
    integrationResponse?: apigateway.IntegrationResponse[];
    methodResponse?: apigateway.MethodResponse[];
  };
  /** GET操作を許可するかどうか */
  allowGetOperation: boolean;
  /** GET操作の設定 */
  getOperationConfig?: {
    resourceName: string;
    requestTemplate: string;
    integrationResponse?: apigateway.IntegrationResponse[];
    methodResponse?: apigateway.MethodResponse[];
  };
  /** SCAN操作を許可するかどうか */
  allowScanOperation: boolean;
  /** SCAN操作の設定 */
  scanOperationConfig?: {
    resourceName: string;
    requestTemplate: string;
    integrationResponse?: apigateway.IntegrationResponse[];
    methodResponse?: apigateway.MethodResponse[];
  };
  /** UPDATE操作を許可するかどうか */
  allowUpdateOperation: boolean;
  /** UPDATE操作の設定 */
  updateOperationConfig?: {
    resourceName: string;
    requestTemplate: string;
    integrationResponse?: apigateway.IntegrationResponse[];
    methodResponse?: apigateway.MethodResponse[];
  };
  /** DELETE操作を許可するかどうか */
  allowDeleteOperation: boolean;
  /** DELETE操作の設定 */
  deleteOperationConfig?: {
    resourceName: string;
    requestTemplate: string;
    integrationResponse?: apigateway.IntegrationResponse[];
    methodResponse?: apigateway.MethodResponse[];
  };
}

/**
 * API GatewayとDynamoDBを接続するConstruct
 */
export class ApiGatewayDynamoDBConstruct extends Construct {
  readonly table: dynamodb.Table;
  readonly api: apigateway.RestApi;

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

    // 各操作の設定が必要かどうかをチェック
    this._validateOperationConfig(props);

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
    const apiGatewayRole = new iam.Role(this, "ApiGatewayRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // リソースの作成
    const resource = this._createResource(props, apiGatewayRole);

    // DynamoDBへのアクセス権限をIAMロールに付与
    this.table.grantReadWriteData(apiGatewayRole);
  }

  /**
   * 各操作の設定が必要かどうかをチェックする
   * @param props コンストラクタのプロパティ
   */
  private _validateOperationConfig(props: IApiGatewayDynamodbProps): void {
    if (props.allowPutOperation && !props.putOperationConfig) {
      throw new Error(
        "putOperationConfig must be provided when allowPutOperation is true"
      );
    }

    if (props.allowGetOperation && !props.getOperationConfig) {
      throw new Error(
        "getOperationConfig must be provided when allowGetOperation is true"
      );
    }

    if (props.allowScanOperation && !props.scanOperationConfig) {
      throw new Error(
        "scanOperationConfig must be provided when allowScanOperation is true"
      );
    }

    if (
      props.allowGetOperation &&
      props.allowScanOperation &&
      props.getOperationConfig?.resourceName ===
        props.scanOperationConfig?.resourceName
    ) {
      throw new Error(
        "Resource name for get and scan operation must be different"
      );
    }

    if (props.allowUpdateOperation && !props.updateOperationConfig) {
      throw new Error(
        "updateOperationConfig must be provided when allowUpdateOperation is true"
      );
    }

    if (props.allowDeleteOperation && !props.deleteOperationConfig) {
      throw new Error(
        "deleteOperationConfig must be provided when allowDeleteOperation is true"
      );
    }
  }

  /**
   * リソースを作成する
   * @param props コンストラクタのプロパティ
   * @param apiGatewayRole API GatewayのIAMロール
   * @returns 作成されたリソース
   */
  private _createResource(
    props: IApiGatewayDynamodbProps,
    apiGatewayRole: iam.Role
  ): apigateway.IResource {
    const resourceSegments = props.resourcePath
      .split("/")
      .filter((segment) => segment.length > 0);
    let currentResource = this.api.root;

    for (const segment of resourceSegments) {
      currentResource = currentResource.addResource(segment);

      // 各HTTPメソッドの設定
      this._setupPutMethod(props, currentResource, apiGatewayRole, segment);
      this._setupGetMethod(props, currentResource, apiGatewayRole, segment);
      this._setupScanMethod(props, currentResource, apiGatewayRole, segment);
      this._setupUpdateMethod(props, currentResource, apiGatewayRole, segment);
      this._setupDeleteMethod(props, currentResource, apiGatewayRole, segment);
    }
    return currentResource;
  }

  /**
   * PUTメソッドを設定する
   * @param props コンストラクタのプロパティ
   * @param resource API Gatewayのリソース
   * @param apiGatewayRole API GatewayのIAMロール
   * @param segment リソースのセグメント
   */
  private _setupPutMethod(
    props: IApiGatewayDynamodbProps,
    resource: apigateway.IResource,
    apiGatewayRole: iam.Role,
    segment: string
  ): void {
    if (
      props.allowPutOperation &&
      props.putOperationConfig &&
      props.putOperationConfig.resourceName === segment
    ) {
      const createIntegration = new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "PutItem",
        options: {
          credentialsRole: apiGatewayRole,
          requestTemplates: {
            "application/json": props.putOperationConfig.requestTemplate,
          },
          integrationResponses: props.putOperationConfig.integrationResponse,
        },
      });
      resource.addMethod("POST", createIntegration, {
        methodResponses: props.putOperationConfig.methodResponse,
      });
    }
  }

  /**
   * GETメソッドを設定する
   * @param props コンストラクタのプロパティ
   * @param resource API Gatewayのリソース
   * @param apiGatewayRole API GatewayのIAMロール
   * @param segment リソースのセグメント
   */
  private _setupGetMethod(
    props: IApiGatewayDynamodbProps,
    resource: apigateway.IResource,
    apiGatewayRole: iam.Role,
    segment: string
  ): void {
    if (
      props.allowGetOperation &&
      props.getOperationConfig &&
      props.getOperationConfig.resourceName === segment
    ) {
      const getIntegration = new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "GetItem",
        options: {
          credentialsRole: apiGatewayRole,
          requestTemplates: {
            "application/json": props.getOperationConfig.requestTemplate,
          },
          integrationResponses: props.getOperationConfig.integrationResponse,
        },
      });
      resource.addMethod("GET", getIntegration, {
        methodResponses: props.getOperationConfig.methodResponse,
      });
    }
  }

  /**
   * SCANメソッドを設定する
   * @param props コンストラクタのプロパティ
   * @param resource API Gatewayのリソース
   * @param apiGatewayRole API GatewayのIAMロール
   * @param segment リソースのセグメント
   */
  private _setupScanMethod(
    props: IApiGatewayDynamodbProps,
    resource: apigateway.IResource,
    apiGatewayRole: iam.Role,
    segment: string
  ): void {
    if (
      props.allowScanOperation &&
      props.scanOperationConfig &&
      props.scanOperationConfig.resourceName === segment
    ) {
      const scanIntegration = new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "Scan",
        options: {
          credentialsRole: apiGatewayRole,
          requestTemplates: {
            "application/json": props.scanOperationConfig.requestTemplate,
          },
          integrationResponses: props.scanOperationConfig.integrationResponse,
        },
      });
      resource.addMethod("GET", scanIntegration, {
        methodResponses: props.scanOperationConfig.methodResponse,
      });
    }
  }

  /**
   * UPDATEメソッドを設定する
   * @param props コンストラクタのプロパティ
   * @param resource API Gatewayのリソース
   * @param apiGatewayRole API GatewayのIAMロール
   * @param segment リソースのセグメント
   */
  private _setupUpdateMethod(
    props: IApiGatewayDynamodbProps,
    resource: apigateway.IResource,
    apiGatewayRole: iam.Role,
    segment: string
  ): void {
    if (
      props.allowUpdateOperation &&
      props.updateOperationConfig &&
      props.updateOperationConfig.resourceName === segment
    ) {
      const updateIntegration = new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "UpdateItem",
        options: {
          credentialsRole: apiGatewayRole,
          requestTemplates: {
            "application/json": props.updateOperationConfig.requestTemplate,
          },
          integrationResponses: props.updateOperationConfig.integrationResponse,
        },
      });
      resource.addMethod("PUT", updateIntegration, {
        methodResponses: props.updateOperationConfig.methodResponse,
      });
    }
  }

  /**
   * DELETEメソッドを設定する
   * @param props コンストラクタのプロパティ
   * @param resource API Gatewayのリソース
   * @param apiGatewayRole API GatewayのIAMロール
   * @param segment リソースのセグメント
   */
  private _setupDeleteMethod(
    props: IApiGatewayDynamodbProps,
    resource: apigateway.IResource,
    apiGatewayRole: iam.Role,
    segment: string
  ): void {
    if (
      props.allowDeleteOperation &&
      props.deleteOperationConfig &&
      props.deleteOperationConfig.resourceName === segment
    ) {
      const deleteIntegration = new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "DeleteItem",
        options: {
          credentialsRole: apiGatewayRole,
          requestTemplates: {
            "application/json": props.deleteOperationConfig.requestTemplate,
          },
          integrationResponses: props.deleteOperationConfig.integrationResponse,
        },
      });
      resource.addMethod("DELETE", deleteIntegration, {
        methodResponses: props.deleteOperationConfig.methodResponse,
      });
    }
  }
}