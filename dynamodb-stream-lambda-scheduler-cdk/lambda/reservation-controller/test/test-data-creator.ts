import {
  FlexibleTimeWindowMode,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import dayjs from "dayjs";

// UT用データ作成クラス
export class UtData {
  // DynamoDBストリームinsertイベントデータ作成
  static createInsertDynamoDBStreamEvent(
    reservationId: string,
    ts: string
  ): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          dynamodb: {
            NewImage: {
              reservationId: {
                S: reservationId,
              },
              executeTimestamp: {
                S: ts,
              },
            },
          },
        },
      ],
    };
  }

  // DynamoDBストリームremoveイベントデータ作成
  static createRemoveDynamoDBStreamEvent(
    reservationId: string
  ): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "REMOVE",
          dynamodb: {
            Keys: {
              reservationId: {
                S: reservationId,
              },
            },
          },
        },
      ],
    };
  }

  // DynamoDBストリームmodifyイベントデータ作成
  static createModifyDynamoDBStreamEvent(
    reservationId: string,
    ts: string
  ): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "MODIFY",
          dynamodb: {
            NewImage: {
              reservationId: {
                S: reservationId,
              },
              executeTimestamp: {
                S: ts,
              },
            },
          },
        },
      ],
    };
  }

  // 登録と更新のinputデータ作成
  static createInputForInsertAndModify(
    reservationId: string,
    executeTimestamp: string
  ): any {
    const executeTime = dayjs(executeTimestamp).format("YYYY-MM-DDThh:mm:ss");
    return {
      Name: reservationId,
      ScheduleExpression: `at(${executeTime})`,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Target: {
        Arn: "arn:aws:lambda:ap-northeast-1:123456789012:function:execute-function",
        RoleArn: "arn:aws:iam::123456789012:role/execute-function-role",
        Input: JSON.stringify({ reservationId }),
      },
      GroupName: "reservation-scheduler-group",
    };
  }

  // 削除のinputデータ作成
  static createInputForDelete(reservationId: string): any {
    return {
      Name: reservationId,
      GroupName: "reservation-scheduler-group",
    };
  }
}

export class UtMock {
  // AWS SDKのSchedulerクラスのcreateScheduleメソッドのモック
  static createScheduleRegisterMock(reservationId: string): jest.SpyInstance {
    return jest
      .spyOn(SchedulerClient.prototype, "send")
      .mockImplementation(() => {
        return Promise.resolve({
          ScheduleArn: `arn:aws:scheduler:ap-northeast-1:123456789012:schedule/${reservationId}`,
        });
      });
  }

  // AWS SDKのSchedulerクラスのdeleteScheduleメソッドのモック
  static deleteScheduleRegisterMock(): jest.SpyInstance {
    return jest
      .spyOn(SchedulerClient.prototype, "send")
      .mockImplementation(() => {
        return Promise.resolve({});
      });
  }

  // AWS SDKのSchedulerクラスのupdateScheduleメソッドのモック
  static updateScheduleRegisterMock(reservationId: string): jest.SpyInstance {
    return jest
      .spyOn(SchedulerClient.prototype, "send")
      .mockImplementation(() => {
        return Promise.resolve({
          ScheduleArn: `arn:aws:scheduler:ap-northeast-1:123456789012:schedule/${reservationId}`,
        });
      });
  }
}
