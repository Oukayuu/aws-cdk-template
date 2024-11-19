import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  FlexibleTimeWindowMode,
  SchedulerClient,
  UpdateScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { DynamoDBRecord } from "aws-lambda/trigger/dynamodb-stream";
import { AttributeMap } from "aws-sdk/clients/dynamodbstreams";
import { ReservationDataType } from ".";
import dayjs from "dayjs";

/**
 * 予約サービスクラス
 */
export class SchedulerController {
  constructor(
    private readonly _schedulerClient: SchedulerClient,
    private readonly _executeFunctionArn: string,
    private readonly _executeFunctionRole: string
  ) {}

  /**
   * REMOVE操作を処理する
   * @param record DynamoDBストリームレコード
   */
  public async handleRemoveOperation(record: DynamoDBRecord): Promise<void> {
    console.log("REMOVE operation detected");

    if (!record.dynamodb?.Keys || !record.dynamodb.Keys.reservationId.S) {
      console.error("Invalid Remove data");
      return;
    }

    await this._deleteEventScheduler(record.dynamodb.Keys.reservationId.S);
    console.log("Event scheduler deleted successfully");
  }

  /**
   * INSERT操作を処理する
   * @param streamData DynamoDBストリームデータ
   */
  public async handleInsertOperation(
    streamData: AttributeMap | undefined
  ): Promise<void> {
    console.log("INSERT operation detected");

    if (
      !streamData ||
      !streamData.reservationId ||
      !streamData.executeTimestamp
    ) {
      console.error("Invalid stream data");
      return;
    }

    const reservationData: ReservationDataType = {
      reservationId: streamData.reservationId.S!,
      executeTime: dayjs(streamData.executeTimestamp.S!).format(
        "YYYY-MM-DDThh:mm:ss"
      ),
    };

    await this._createEventScheduler(reservationData);
    console.log("Event scheduler created successfully");
  }

  /**
   * MODIFY操作を処理する
   * @param streamData DynamoDBストリームデータ
   */
  public async handleModifyOperation(
    streamData: AttributeMap | undefined
  ): Promise<void> {
    console.log("MODIFY operation detected");

    if (
      !streamData ||
      !streamData.reservationId ||
      !streamData.executeTimestamp
    ) {
      console.error("Invalid stream data");
      return;
    }

    const reservationData: ReservationDataType = {
      reservationId: streamData.reservationId.S!,
      executeTime: dayjs(streamData.executeTimestamp.S!).format(
        "YYYY-MM-DDThh:mm:ss"
      ),
    };

    await this._updateEventScheduler(reservationData);
    console.log("Event scheduler updated successfully");
  }

  private async _createEventScheduler(
    reservationData: ReservationDataType
  ): Promise<void> {
    const input = {
      Name: reservationData.reservationId,
      ScheduleExpression: `at(${reservationData.executeTime})`,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Target: {
        Arn: this._executeFunctionArn,
        RoleArn: this._executeFunctionRole,
        Input: JSON.stringify({ reservationId: reservationData.reservationId }),
      },
      GroupName: "reservation-scheduler-group",
    };
    console.log("Creating schedule with input:", JSON.stringify(input));
    const command = new CreateScheduleCommand(input);
    const result = await this._schedulerClient.send(command);
    console.log("Schedule creation result:", JSON.stringify(result));
  }

  private async _updateEventScheduler(
    reservationData: ReservationDataType
  ): Promise<void> {
    const input = {
      Name: reservationData.reservationId,
      ScheduleExpression: `at(${reservationData.executeTime})`,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Target: {
        Arn: this._executeFunctionArn,
        RoleArn: this._executeFunctionRole,
        Input: JSON.stringify({ reservationId: reservationData.reservationId }),
      },
      GroupName: "reservation-scheduler-group",
    };
    console.log("Updating schedule with input:", JSON.stringify(input));
    const command = new UpdateScheduleCommand(input);
    const result = await this._schedulerClient.send(command);
    console.log("Schedule update result:", JSON.stringify(result));
  }

  private async _deleteEventScheduler(reservationId: string): Promise<void> {
    const input = {
      Name: reservationId,
      GroupName: "reservation-scheduler-group",
    };
    console.log("Deleting schedule with input:", JSON.stringify(input));
    const command = new DeleteScheduleCommand(input);
    const result = await this._schedulerClient.send(command);
    console.log("Schedule deletion result:", JSON.stringify(result));
  }
}
