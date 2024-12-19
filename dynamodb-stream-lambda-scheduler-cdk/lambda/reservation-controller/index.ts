import { DynamoDBStreamEvent } from "aws-lambda";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { SchedulerController } from "./scheduler-controller";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION });
const EXECUTE_FUNCTION_ARN = process.env.EXECUTE_FUNCTION_ARN;
const EXECUTE_FUNCTION_ROLE = process.env.EXECUTE_FUNCTION_ROLE;

export type ReservationDataType = {
  reservationId: string;
  executeTime: string;
};

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  await main(event);
};

/**
 * DynamoDBストリームイベントを処理するメイン関数
 * @param event DynamoDBストリームイベント
 */
async function main(event: DynamoDBStreamEvent) {
  try {
    const reservationService = new SchedulerController(
      schedulerClient,
      EXECUTE_FUNCTION_ARN!,
      EXECUTE_FUNCTION_ROLE!
    );
    for (const record of event.Records) {
      console.log("Record: %j", record);
      const streamData = record.dynamodb?.NewImage;

      switch (record.eventName) {
        case "REMOVE":
          await reservationService.handleRemoveOperation(record);
          break;
        case "INSERT":
          await reservationService.handleInsertOperation(streamData);
          break;
        case "MODIFY":
          await reservationService.handleModifyOperation(streamData);
          break;
        default:
          console.error("Unsupported event name:", record.eventName);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
