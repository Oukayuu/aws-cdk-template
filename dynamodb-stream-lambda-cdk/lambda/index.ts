import { DynamoDBStreamEvent, Context } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import AWS from 'aws-sdk';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const scheduler = new AWS.Scheduler();

export type ReservationData = {
  reservationId: string;
  executeTimestamp: string;
}

export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<any> => {
  const responses = [];

  // DynamoDBストリームイベントの処理
  for (const record of event.Records) {
    console.log('DynamoDB Record: %j', record.dynamodb);
    const streamData = record.dynamodb?.NewImage; // ストリームデータを取り出す
    console.log('Stream Data: %j', streamData);

    // ストリームデータが存在しない場合はスキップ
    if (!streamData || !streamData.reservationId || !streamData.executeTimestamp) {
      console.error('Invalid stream data');
      responses.push({
        recordId: record.eventID,
        result: 'Skipped'
      });
      continue;
    }

    // ストリームデータを取り出してReservationData型に変換
    const reservationData: ReservationData = {
      reservationId: streamData.reservationId.S!,
      executeTimestamp: streamData.executeTimestamp.S!
    }

    if (record.eventName === 'INSERT') {
      // INSERT操作のロジック
      console.log('INSERT operation detected');

      try {
        await createEventScheduler(reservationData.reservationId, reservationData.executeTimestamp);
        console.log('Event scheduler created successfully');
      } catch (error) {
        console.error('Error creating event scheduler:', error);
      }

    } else if (record.eventName === 'MODIFY') {
      // MODIFY操作のロジック
      console.log('MODIFY operation detected');
      const executeTimestamp = streamData?.executeTimestamp?.S;
      if (executeTimestamp) {
        try {
          await updateEventScheduler(reservationData.reservationId, reservationData.executeTimestamp);
          console.log('Event scheduler updated successfully');
        } catch (error) {
          console.error('Error updating event scheduler:', error);
        }
      }
    } else if (record.eventName === 'REMOVE') {
      // REMOVE操作のロジック
      console.log('REMOVE operation detected');
      try {
        await deleteEventScheduler(reservationData.reservationId);
        console.log('Event scheduler deleted successfully');
      } catch (error) {
        console.error('Error deleting event scheduler:', error);
      }
    }

    responses.push({
      recordId: record.eventID,
      result: 'Processed'
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Processing completed',
      responses: responses
    })
  };
};

const createEventScheduler = async (id: string, timestamp: string) => { 
  const params = {
    Name: id,
    ScheduleExpression: `at(${timestamp})`,
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:224612091524:function:DynamodbStreamLambdaCdkStack-MyFunction3BAA72D1-BblbYhmlcwsN', // ここにターゲットのARNを指定
      RoleArn: 'arn:aws:iam::123456789012:role/MyRole', // ここにターゲットのロールARNを指定
      Input: JSON.stringify({ id })
    }
  };
  console.log('Creating schedule with params:', JSON.stringify(params, null, 2));
  const result = await scheduler.createSchedule(params).promise();
  console.log('Schedule creation result:', JSON.stringify(result, null, 2));
};

const updateEventScheduler = async (id: string, timestamp: string) => {
  // 既存のイベントを削除して新しいイベントを作成
  await deleteEventScheduler(id);
  await createEventScheduler(id, timestamp);
};

const deleteEventScheduler = async (id: string) => {
  const params = {
    Name: id,
    GroupName: 'default'
  };
  console.log('Deleting schedule with params:', JSON.stringify(params, null, 2));
  const result = await scheduler.deleteSchedule(params).promise();
  console.log('Schedule deletion result:', JSON.stringify(result, null, 2));
};