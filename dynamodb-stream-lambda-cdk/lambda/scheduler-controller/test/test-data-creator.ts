import { FlexibleTimeWindowMode, SchedulerClient } from "@aws-sdk/client-scheduler";
import { DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import dayjs from "dayjs";

// UT用データ作成クラス
export class UtData {
  // DynamoDBストリームイベントデータ作成
  static createInsertDynamoDBStreamEvent(reservationId: string,ts: string): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reservationId: {
                S: reservationId
              },
              executeTimestamp: {
                S: ts
              }
            }
          }
        }
      ]
    };
  }

  // inputデータ作成
  static createInput(reservationId: string, executeTimestamp: string): any {
    const executeTime = dayjs(executeTimestamp).format('YYYY-MM-DDThh:mm:ss');
    return {
      Name: reservationId,
      ScheduleExpression: `at(${executeTime})`,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF
      },
      Target: {
        Arn: "arn:aws:lambda:ap-northeast-1:123456789012:function:execute-function",
        RoleArn: "arn:aws:iam::123456789012:role/execute-function-role",
        Input: JSON.stringify({ reservationId })
      },
      GroupName: 'reservation-scheduler-group'
    };
  }
}

export class UtMock {
  // AWS SDKのSchedulerクラスのcreateScheduleメソッドのモック
  static createScheduleRegisterMock(reservationId: string) : jest.SpyInstance {
    return jest.spyOn(SchedulerClient.prototype, 'send').mockImplementation(() => {
      return Promise.resolve({
        ScheduleArn: `arn:aws:scheduler:ap-northeast-1:123456789012:schedule/${reservationId}`
      });
    });
  }

  // AWS SDKのSchedulerクラスのdeleteScheduleメソッドのモック
  static deleteScheduleRegisterMock(): jest.SpyInstance {
    return jest.spyOn(SchedulerClient.prototype, 'send').mockImplementation(() => {
      return Promise.resolve({});
    });
  }

  // AWS SDKのSchedulerクラスのupdateScheduleメソッドのモック
  static updateScheduleRegisterMock(reservationId: string): jest.SpyInstance {
    return jest.spyOn(SchedulerClient.prototype, 'send').mockImplementation(() => {
      return Promise.resolve({
        ScheduleArn: `arn:aws:scheduler:ap-northeast-1:123456789012:schedule/${reservationId}`
      });
    });
  }
}