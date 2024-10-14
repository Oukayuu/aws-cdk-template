import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import { ApiGatewayToDynamoDB } from "./api-gateway-dynamodb-cdk-construct";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from 'aws-cdk-lib/aws-iam';
// import { ApiGatewayToDynamoDBProps, ApiGatewayToDynamoDB } from "@aws-solutions-constructs/aws-apigateway-dynamodb";

export class ApiGatewayDynamodbCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // dynamodb tableを作成
    const companyTable = new dynamodb.Table(this, "company-table", {
      partitionKey: {
        name: "company_id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "company-table",
    });

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'api-gateway-dynamodb-api-gateway',
      deployOptions: {
        stageName: 'dev',
      },
    });

    // /company リソースの作成
    const companyResource = api.root.addResource('company');

    // /company/{company_id} リソースの作成
    const companyIdResource = companyResource.addResource('{company_id}');

    // IAMロールの作成
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    // DynamoDBへのアクセス権限をIAMロールに付与
    companyTable.grantReadWriteData(apiGatewayRole);

    // POSTメソッドの追加
    const postIntegration = new apigateway.AwsIntegration({
      service: 'dynamodb',
      action: 'PutItem',
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          'application/json': `{
          "TableName": "${companyTable.tableName}",
          "Item": {
            "company_id": {
              "S": $input.json('$.company_id')
            },
            "address": {
              "S": $input.json('$.address')
            }
          }
        }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '{"message": "Item added successfully"}',
            },
          },
          {
            statusCode: '400',
            selectionPattern: '4\\d{2}', // 4xxエラーをキャッチ
            responseTemplates: {
              'application/json': '{"message": "Bad Request"}',
            },
          },
        ],
      },
    });

    companyResource.addMethod('POST', postIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    const getIntegration = new apigateway.AwsIntegration({
      service: 'dynamodb',
      action: 'GetItem',
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          'application/json': `{
            "TableName": "${companyTable.tableName}",
            "Key": {
              "company_id": {
                "S": "$input.params('company_id')"
              }
            }
          }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `#set($inputRoot = $input.path('$'))
              {
                "company_id": "$inputRoot.Item.company_id.S",
                "address": "$inputRoot.Item.address.S"
              }`,
            },
          },
          {
            statusCode: '400',
            selectionPattern: '4\\d{2}', // 4xxエラーをキャッチ
            responseTemplates: {
              'application/json': '{"message": "Bad Request"}',
            },
          },
        ],
      },
    });
    
    companyIdResource.addMethod('GET', getIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });


    const scanIntegration = new apigateway.AwsIntegration({
      service: 'dynamodb',
      action: 'Scan',
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          'application/json': `{
            "TableName": "${companyTable.tableName}"
          }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `#set($inputRoot = $input.path('$'))
              {
                "items": [
                  #foreach($item in $inputRoot.Items)
                    {
                      "company_id": "$item.company_id.S",
                      "address": "$item.address.S"
                    }#if($foreach.hasNext),#end
                  #end
                ]
              }`,
            },
          },
          {
            statusCode: '400',
            selectionPattern: '4\\d{2}', // 4xxエラーをキャッチ
            responseTemplates: {
              'application/json': '{"message": "Bad Request"}',
            },
          },
        ],
      },
    });
    
    companyResource.addMethod('GET', scanIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    // const apiGatewayToDynamoDB = new ApiGatewayToDynamoDB(this, "test-api-gateway-dynamodb-default", {
    //   existingTableObj: companyTable,
    //   apiGatewayProps: { restApiName: "api-gateway-dynamodb-api-gateway" },
    //   resourceName: "company",
    //   allowReadOperation: true,
    //   readRequestTemplate: `{
    //     "TableName": "${companyTable.tableName}",
    //     "KeyConditionExpression": "company_id = :company_id",
    //     "ExpressionAttributeValues": {
    //       ":company_id": {
    //         "S": "$input.params('company_id')"
    //       }
    //     }
    //   }`,
    // });

  }
}
