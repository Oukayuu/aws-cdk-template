// 環境変数の設定
process.env.EXECUTE_FUNCTION_ARN =
  "arn:aws:lambda:ap-northeast-1:123456789012:function:execute-function";
process.env.EXECUTE_FUNCTION_ROLE =
  "arn:aws:iam::123456789012:role/execute-function-role";
import { handler } from "..";
import { UtData, UtMock } from "./test-data-creator";

const reservationId = "reservationId-001";
const executeTimestamp = "2021-09-01T00:00:00";

describe("SchedulerController", () => {
  let spyCreateEventScheduler: jest.SpyInstance;
  let spyUpdateEventScheduler: jest.SpyInstance;
  let spyDeleteEventScheduler: jest.SpyInstance;

  beforeEach(() => {
    // UT実施する前に、mockを初期化
    jest.resetAllMocks();
    spyCreateEventScheduler = UtMock.createScheduleRegisterMock(reservationId);
    spyUpdateEventScheduler = UtMock.createScheduleRegisterMock(reservationId);
    spyDeleteEventScheduler = UtMock.deleteScheduleRegisterMock();
  });

  it("スケジューラ登録処理が正常に実行されること", async () => {
    // テストデータ作成
    const createEvent = UtData.createInsertDynamoDBStreamEvent(
      reservationId,
      executeTimestamp
    );

    // テスト実行
    await handler(createEvent);

    // モックの呼び出し確認
    expect(spyCreateEventScheduler).toHaveBeenCalledTimes(1);
    expect(spyCreateEventScheduler.mock.calls[0][0].input).toStrictEqual(
      UtData.createInputForInsertAndModify(reservationId, executeTimestamp)
    );
  });
  it("スケジューラ更新処理が正常に実行されること", async () => {
    // テストデータ作成
    const updateEvent = UtData.createModifyDynamoDBStreamEvent(
      reservationId,
      executeTimestamp
    );

    // テスト実行
    await handler(updateEvent);

    // モックの呼び出し確認
    expect(spyUpdateEventScheduler).toHaveBeenCalledTimes(1);
    expect(spyUpdateEventScheduler.mock.calls[0][0].input).toStrictEqual(
      UtData.createInputForInsertAndModify(reservationId, executeTimestamp)
    );
  });
  it("スケジューラ削除処理が正常に実行されること", async () => {
    // テストデータ作成
    const deleteEvent = UtData.createRemoveDynamoDBStreamEvent(reservationId);

    // テスト実行
    await handler(deleteEvent);

    // モックの呼び出し確認
    expect(spyDeleteEventScheduler).toHaveBeenCalledTimes(1);
    expect(spyDeleteEventScheduler.mock.calls[0][0].input).toStrictEqual(
      UtData.createInputForDelete(reservationId)
    );
  });
});
