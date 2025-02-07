# ApiGatewayDynamoDBConstruct

## Overview

`ApiGatewayDynamoDBConstruct`は、API Gateway と DynamoDB を接続するための AWS CDK コンストラクトです。このコンストラクトは、DynamoDB テーブルと API Gateway を作成し、API Gateway のリソースに対して DynamoDB の操作を行うメソッドを設定します。

## Construct Props

`IApiGatewayDynamodbProps`は、`ApiGatewayDynamoDBConstruct`で使用するプロパティのインターフェースで、以下のプロパティを含めます。

| プロパティ名     | 　型                                                                                                                | 必須     | 説明                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| dynamoTableProps | [dynamodb.TableProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html)         | required | DynamoDB テーブルを設定するプロパティ |
| apiGatewayProps  | [apigateway.RestApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiProps.html) | required | API Gateway を設定するプロパティ      |

## Construct Method

| メソッド名                                       | 説明                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| setupMethod(resourcePath,operation,methodConfig) | apigateway に、指定されたリソースパスに紐付けるメソッドを作成する |

#### setupMethod(resourcePath,operation,methodConfig)

```typescript
  public setupMethod(resourcePath: string, operation: OperationType, methodConfig: IMethodConfig): void
```

_Parameters_

- **resourcePath** `string` -リソースパス （もし存在しなければ、メソッド内で新規作成される）
- **operation** `OperationType` -テーブルに対する操作（ "create" | "read" | "list" | "update" | "delete"）
- **methodConfig** [IMethodConfig](#interface-imethodconfig) -メソッド設定

このメソッドは、指定されたリソースパスに対して API Gateway のメソッドを設定します。リソースパスが存在しない場合は、新規に作成されます。指定された操作タイプに基づいて、DynamoDB テーブルに対する適切なアクションが設定されます。メソッド設定は、リクエストテンプレートやレスポンス設定などの詳細な設定を含みます。
※本メソッドを実行しないでデプロイすると、apigateway と dynamodb を作成するだけです。

---

##　構成図
![予約要求受付](./design/api-gateway-dynamodb-template.png)

#### 処理フロー

1. **外部クライアントからのリクエスト送信**

   - クライアント（モバイルアプリやウェブアプリなど）から、API Gateway に予約要求リクエストを送信。
   - DB に対する照会、登録、更新、削除などの操作が含まれる。

2. **API Gateway によるリクエスト整形**

   - API Gateway のマッピングテンプレートを使用し、リクエスト内容を整形。
   - DynamoDB に対応したメソッド（PutItem, GetItem, UpdateItem, DeleteItem）を呼び出し、リクエスト内容を DynamoDB に送信。

3. **DynamoDB からのレスポンス取得**

   - DynamoDB のメソッドの結果が API Gateway に返される。

4. **API Gateway によるレスポンスの整形と返却**
   - API Gateway は、DynamoDB の結果を整形し、外部クライアントにレスポンスとして送信。
     <br>

#### API Gateway から DynamoDB へ直接アクセスする方法

- **メリット**

  - ✅ **シンプルな構成**: Lambda を経由せず、直接 API Gateway から DynamoDB へアクセス。
  - ✅ **低コスト**: Lambda のオーバーヘッドがなく、コストを抑えつつ同じ機能を実現。
  - ✅ **迅速な API 構築**: Lambda 実装が不要なため、より速く API を構築可能。

- **デメリット**
  - ❌ **複雑なロジックを組み込めない**: マッピングテンプレートでは複雑なビジネスロジックの処理が難しい。

<br>

#### ConstructHub のライブラリとの比較

- ConstructHub には、同じ構成を簡単に実現できるライブラリが提供されている（[@aws-solutions-constructs/aws-apigateway-dynamodb](https://construct-hub-testing.dev-tools.aws.dev/packages/@aws-solutions-constructs/aws-apigateway-dynamodb/v/2.64.0?lang=typescript)）。
- しかし、ConstructHub のライブラリでは API Gateway のリソースを自由に定義・追加することができない制約がある。
- そのため、この制約を克服するために本テンプレートが作成された。
  <br>

---

## Construct の利用手順

#### Quick Start

1. `git clone [本リポジトリ]`コマンドを実行して、本テンプレートをダウンロードする
2. `cd apigateway-dynamodb-cdk`コマンドを実行して、CDK ディレクトリに移動する
3. `npm ci`コマンドを実行して、必要なモジュール、ライブラリーをインストールする
4. `cdk synth`コマンドを実行して、CloudFormation テンプレートを生成する
5. `cdk deploy ApigatewayDynamodbCdkStack`コマンドを実行して、スタックをデプロイする

#### 要件に合わせて修正

1. スタッククラス`ApigatewayDynamodbCdkStack`の.ts ファイルを開く

2. DynamoDB テーブルの設定修正

```typescript
// dynamodbの作成
const dynamodbProps: dynamodb.TableProps = {
  tableName: "reservation-table",
  partitionKey: {
    name: "reservationId",
    type: dynamodb.AttributeType.STRING,
  },
};
```

必要であれば、テーブルの他の諸設定を編集する（GSI、LSI、課金モードなど）
<br>

3. API Gateway の設定修正

```typescript
// API Gatewayの作成
const apigatewayProps: apigateway.RestApiProps = {
  restApiName: "reservation-api-gateway",
  deployOptions: {
    stageName: "dev",
  },
};
```

必要であれば、apigateway の他の諸設定を編集する（エンドポイントタイプ、ドメインネイムなど）
<br>

4. Construct を作成する

```typescript
// ApiGatewayDynamoDBConstructをインスタンス化
const construct = new ApiGatewayDynamoDBConstruct(this, "ApiGatewayDynamoDB", {
  dynamoTableProps: dynamodbProps,
  apiGatewayProps: apigatewayProps,
});
```

<br>

5. setupMethod()を呼び出し、リソースとメソッドを作成する（必要に応じて、複数のメソッドを追加可能）
   ※VTL の書き方は[AWS 開発者ガイド](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html?icmpid=docs_apigateway_console)を参考
   　例：登録操作を追加する

```typescript
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

// apigatewayにメソッドを追加
construct.setupMethod("v1/dummy/reservations", "create", {
  requestTemplate: createRequestTemplate,
  integrationResponse: createIntegrationResponse,
  methodResponse: createMethodResponse,
});
```

#### リソース削除

1. `cdk destroy ApigatewayDynamodbCdkStack`コマンドを実行して、スタックを削除する
2. AWS コンソール上に dynamodb を手動で削除する
3. 削除が完了したら、CloudFormation スタックが削除されていることを確認する

---

# interface IMethodConfig

## Properties

| プロパティ名        | 型                                                                                                                     | 必須     | 説明                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| requestTemplate     | 　　　 string                                                                                                          | required | リクエストテンプレート       |
| integrationResponse | [integrationResponse](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html) | required | インテグレーションレスポンス |
| methodResponse      | [methodResponse](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)           | required | メソッドレスポンス           |

メソッド設定用のインターフェース
