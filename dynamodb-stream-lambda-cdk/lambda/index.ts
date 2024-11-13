import { DynamoDBStreamEvent, Context } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import AWS from 'aws-sdk';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const eventBridge = new AWS.EventBridge();

const createEventScheduler = async (id: string, timestamp: string) => {
  const params = {
    Entries: [
      {
        Source: 'my.dynamodb.stream',
        DetailType: 'Scheduled Event',
        Detail: JSON.stringify({ id }),
        Time: new Date(timestamp),
        EventBusName: 'default'
      }
    ]
  };
  await eventBridge.putEvents(params).promise();
};

const updateEventScheduler = async (id: string, timestamp: string) => {
  // 既存のイベントを削除して新しいイベントを作成
  await deleteEventScheduler(id);
  await createEventScheduler(id, timestamp);
};

const deleteEventScheduler = async (id: string) => {
  const params = {
    Name: id,
    EventBusName: 'default'
  };
  await eventBridge.deleteRule(params).promise();
};

export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<any> => {
  const responses = [];
  
  // DynamoDBストリームイベントの処理
  for (const record of event.Records) {
    console.log('DynamoDB Record: %j', record.dynamodb);
    const streamData = record.dynamodb?.NewImage; // ストリームデータを取り出す
    console.log('Stream Data: %j', streamData);
    
    // record.eventIDが存在しない場合はエラー
    if (!record.eventID) {
      throw new Error('Event ID must be provided');
    }

    if (record.eventName === 'INSERT') {
      // INSERT操作のロジック
      console.log('INSERT operation detected');
      const executeTimestamp = streamData?.executeTimestamp?.S;
      if (executeTimestamp) {
        await createEventScheduler(record.eventID, executeTimestamp);
      }
    } else if (record.eventName === 'MODIFY') {
      // MODIFY操作のロジック
      console.log('MODIFY operation detected');
      const executeTimestamp = streamData?.executeTimestamp?.S;
      if (executeTimestamp) {
        await updateEventScheduler(record.eventID, executeTimestamp);
      }
    } else if (record.eventName === 'REMOVE') {
      // REMOVE操作のロジック
      console.log('REMOVE operation detected');
      await deleteEventScheduler(record.eventID);
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