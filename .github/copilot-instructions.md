# GitHub Copilot Custom Instructions 

## General Guidelines
- ファイル内のコメントは日本語で記述すること。
- クリーンアーキテクチャとドメイン駆動設計の原則に従うこと。
- コードがパフォーマンスと効率性を最適化するようにすること。
- すべての公開クラス、メソッド、およびインターフェースにTypedocコメントを含めること。

## Naming Conventions
- **Interfaces**: `I`で始まり、PascalCaseを使用する。例: `IUserService`
- **Types**: `Type`で終わり、PascalCaseを使用する。例: `UserType`
- **Classes**: PascalCaseを使用する。例: `UserService`
- **Enums**: PascalCaseを使用する。例: `UserStatus`
- **Private Methods and Properties**: `_`で始まり、camelCaseを使用する。例: `_calculateTotal`, `_userRepository`
- **Variables**: camelCaseを使用する。例: `userName`
- **Methods**: camelCaseを使用する。例: `fetchUserData`
- **File Names**: kebab-caseを使用する。例: `user-service.ts`

## TypeScript Specifics
- すべてのAWS Lambda実装に`TypeScript`を使用すること。
- Node.jsバージョン20との互換性を確保すること。
- AWS SDKバージョン3を使用すること。
- インフラストラクチャコード（IaC）にはAWS CDKバージョン2を活用すること。
- TypeScriptコードのテストにはJestを使用すること。

## Example
```typescript
/** 
 * ユーザーサービスのインターフェース
 */
interface IUserService {
  /** 
   * ユーザーを取得する
   * @param id ユーザーのID
   * @returns ユーザーのデータ
   */
  getUser(id: string): Promise<UserType>;
}

/** 
 * ユーザーのタイプ定義
 */
type UserType = { 
  id: string; 
  name: string; 
  email: string; 
};

/** 
 * ユーザーサービスのクラス
 * @implements IUserService
 */
class UserService implements IUserService {
  constructor(private readonly _userRepository: IUserRepository) {}

  /** 
   * ユーザーをIDで取得する
   * @param id ユーザーのID
   * @returns ユーザーのデータ
   */
  public async getUser(id: string): Promise<UserType> {
    return this._userRepository.findById(id);
  }
}

/** 
 * ユーザーリポジトリのインターフェース
 */
interface IUserRepository {
  /** 
   * IDでユーザーを検索する
   * @param id ユーザーのID
   * @returns ユーザーのデータ
   */
  findById(id: string): Promise<UserType>;
}

/** 
 * ユーザーリポジトリのクラス
 * @implements IUserRepository
 */
class UserRepository implements IUserRepository {
  /** 
   * IDでユーザーを検索する
   * @param id ユーザーのID
   * @returns ユーザーのデータ
   */
  public async findById(id: string): Promise<UserType> {
    // データソースからユーザーデータを取得する実装
    const userData = await someDataSource.fetchUser(id);
    // ローカル変数の例
    return userData;
  }
}