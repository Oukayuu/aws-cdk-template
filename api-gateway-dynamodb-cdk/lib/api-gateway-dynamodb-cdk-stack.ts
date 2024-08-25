import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiGatewayToDynamoDB } from "./api-gateway-dynamodb-cdk-construct";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

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

    // api gatewayを作成
    const api = new apigateway.RestApi(this, "books-api");

    api.root.addMethod("ANY");

    const books = api.root.addResource("books");
    books.addMethod("GET");
    books.addMethod("POST");

    const book = books.addResource("{book_id}");
    book.addMethod("GET");
    book.addMethod("DELETE");

    new ApiGatewayToDynamoDB(this, "test-api-gateway-dynamodb-default", {
      existingTableObj: companyTable,
      apiGatewayProps: { restApiName: "api-gateway-dynamodb-api-gateway" },
      allowReadOperation: true,
      readRequestTemplate: `{
        "TableName": "${companyTable.tableName}",
        "KeyConditionExpression": "company_id = :company_id",
        "ExpressionAttributeValues": {
          ":company_id": {
            "S": "$input.params('company_id')"
          }
        }
      }`,
    });
  }
}
