import { DynamoDBStreamEvent, Context } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import AWS from 'aws-sdk';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const scheduler = new AWS.Scheduler();

// 実行関数LambdaのARNを環境変数から取得
const EXECUTE_FUNCTION_ARN = process.env.EXECUTE_FUNCTION_ARN;

// 実行関数のロールARNを環境変数から取得
const EXECUTE_FUNCTION_ROLE = process.env.EXECUTE_FUNCTION_ROLE;

export type ReservationData = {
  reservationId: string;
  executeTime: string;
}

export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<void> => {
  await main(event);
};

async function main(event: DynamoDBStreamEvent) {
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

      try {
        await deleteEventScheduler(record.dynamodb.Keys.reservationId.S);
        console.log('Event scheduler deleted successfully');
        continue;
      } catch (error) {
        console.error('Error deleting event scheduler:', error);
      }
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

      try {
        await createEventScheduler(reservationData.reservationId, reservationData.executeTime);
        console.log('Event scheduler created successfully');
      } catch (error) {
        console.error('Error creating event scheduler:', error);
      }

    } else if (record.eventName === 'MODIFY') {
      // MODIFY操作のロジック
      console.log('MODIFY operation detected');

      try {
        await updateEventScheduler(reservationData.reservationId, reservationData.executeTime);
        console.log('Event scheduler updated successfully');
      } catch (error) {
        console.error('Error updating event scheduler:', error);
      }
    }
  }
}


/**
 * スケジュールを作成するメソッド
 * @param reservationId 
 * @param time 
 */
async function createEventScheduler(reservationId: string, time: string) {
  const params = {
    Name: reservationId,
    ScheduleExpression: `at(${time})`,
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    Target: {
      Arn: EXECUTE_FUNCTION_ARN!,
      RoleArn: EXECUTE_FUNCTION_ROLE!,
      Input: JSON.stringify({ reservationId: reservationId })
    },
    ActionAfterCompletion: "DELETE",
    Description: "Execute reservation scheduler",
    ScheduleExpressionTimezone: "Asia/Tokyo",
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Creating schedule with params:', JSON.stringify(params, null, 2));
  const result = await scheduler.createSchedule(params).promise();
  console.log('Schedule creation result:', JSON.stringify(result, null, 2));
};

/**
 * スケジュールを更新するメソッド
 * @param reservationId 
 * @param time 
 */
async function updateEventScheduler(reservationId: string, time: string) {
  // 既存のイベントを削除して新しいイベントを作成
  const params = {
    Name: reservationId,
    ScheduleExpression: `at(${time})`,
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    Target: {
      Arn: EXECUTE_FUNCTION_ARN!,
      RoleArn: EXECUTE_FUNCTION_ROLE!,
      Input: JSON.stringify({ reservationId: reservationId })
    },
    ActionAfterCompletion: "DELETE",
    Description: "Execute reservation scheduler",
    ScheduleExpressionTimezone: "Asia/Tokyo",
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Updating schedule with params:', JSON.stringify(params, null, 2));
  const result = await scheduler.updateSchedule(params).promise();
  console.log('Schedule update result:', JSON.stringify(result, null, 2));
};

/**
 *  スケジュールを削除するメソッド
 * @param reservationId 
 */
async function deleteEventScheduler(reservationId: string) {
  const params = {
    Name: reservationId,
    GroupName: 'reservation-scheduler-group'
  };
  console.log('Deleting schedule with params:', JSON.stringify(params, null, 2));
  const result = await scheduler.deleteSchedule(params).promise();
  console.log('Schedule deletion result:', JSON.stringify(result, null, 2));
};