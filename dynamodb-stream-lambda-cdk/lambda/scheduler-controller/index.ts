import { DynamoDBStreamEvent, Context } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand, UpdateScheduleCommand, FlexibleTimeWindowMode } from '@aws-sdk/client-scheduler';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION });

// 実行関数LambdaのARNを環境変数から取得
const EXECUTE_FUNCTION_ARN = process.env.EXECUTE_FUNCTION_ARN;

// 実行関数のロールARNを環境変数から取得
const EXECUTE_FUNCTION_ROLE = process.env.EXECUTE_FUNCTION_ROLE;

export type ReservationData = {
  reservationId: string;
  executeTime: string;
}

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  await main(event);
};

async function main(event: DynamoDBStreamEvent) {
  try {
    // DynamoDBストリームイベントの処理
    for (const record of event.Records) {
      console.log('Record: %j', record);
      const streamData = record.dynamodb?.NewImage; // ストリームデータを取り出す

      if (record.eventName === 'REMOVE') {
        // REMOVE操作のロジック
        console.log('REMOVE operation detected');

        // ストリームデータが存在しない場合はスキップ 
        if (!record.dynamodb?.Keys || !record.dynamodb.Keys.reservationId.S) {
          console.error('Invalid Remove data');
          continue;
        }

        // スケジュールを削除
        await deleteEventScheduler(record.dynamodb.Keys.reservationId.S);
        console.log('Event scheduler deleted successfully');
        continue;
      }

      // ストリームデータが存在しない場合はスキップ
      if (!streamData || !streamData.reservationId || !streamData.executeTimestamp) {
        console.error('Invalid stream data');
        continue;
      }

      // ストリームデータを取り出してReservationData型に変換
      const reservationData: ReservationData = {
        reservationId: streamData.reservationId.S!,
        executeTime: dayjs(streamData.executeTimestamp.S!).format('YYYY-MM-DDThh:mm:ss')
      }

      if (record.eventName === 'INSERT') {
        // INSERT操作のロジック
        console.log('INSERT operation detected');

        // スケジュールを作成
        await createEventScheduler(reservationData.reservationId, reservationData.executeTime);
        console.log('Event scheduler created successfully');

      } else if (record.eventName === 'MODIFY') {
        // MODIFY操作のロジック
        console.log('MODIFY operation detected');

        // スケジュールを更新
        await updateEventScheduler(reservationData.reservationId, reservationData.executeTime);
        console.log('Event scheduler updated successfully');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function createEventScheduler(reservationId: string, executeTime: string) {
  const input = {
    Name: reservationId,
    ScheduleExpression: `at(${executeTime})`,
    FlexibleTimeWindow: {
      Mode: FlexibleTimeWindowMode.OFF
    },
    Target: {
      Arn: EXECUTE_FUNCTION_ARN,
      RoleArn: EXECUTE_FUNCTION_ROLE,
      Input: JSON.stringify({ reservationId })
    },
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Creating schedule with input:', JSON.stringify(input, null, 2));
  const command = new CreateScheduleCommand(input);
  const result = await schedulerClient.send(command);
  console.log('Schedule creation result:', JSON.stringify(result, null, 2));
}

async function updateEventScheduler(reservationId: string, executeTime: string) {
  const input = {
    Name: reservationId,
    ScheduleExpression: `at(${executeTime})`,
    FlexibleTimeWindow: {
      Mode: FlexibleTimeWindowMode.OFF
    },
    Target: {
      Arn: EXECUTE_FUNCTION_ARN,
      RoleArn: EXECUTE_FUNCTION_ROLE,
      Input: JSON.stringify({ reservationId })
    },
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Updating schedule with input:', JSON.stringify(input, null, 2));
  const command = new UpdateScheduleCommand(input);
  const result = await schedulerClient.send(command);
  console.log('Schedule update result:', JSON.stringify(result, null, 2));
}

async function deleteEventScheduler(reservationId: string) {
  const input = {
    Name: reservationId,
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Deleting schedule with input:', JSON.stringify(input, null, 2));
  const command = new DeleteScheduleCommand(input);
  const result = await schedulerClient.send(command);
  console.log('Schedule deletion result:', JSON.stringify(result, null, 2));
}