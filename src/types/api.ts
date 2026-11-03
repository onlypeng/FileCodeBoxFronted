/**
 * 后端统一响应信封的类型定义。
 *
 * ## 问题
 * 后端所有接口都包一层 `{ code, message, detail }`，业务数据放在 `detail` 里。
 * 若各处各自手写推断，一旦后端调整包装方式就要改几十处。
 *
 * ## 取舍
 * 这里只描述信封本身，**不描述任何具体业务的返回值**——那些放在
 * `file.ts` / `collection.ts` / `direct.ts` 等业务类型文件里，避免本文件变成垃圾桶。
 * `code` 用 number 而非 200/400 字面量联合：后端的业务码并未收敛成固定枚举，
 * 收窄成字面量只会让每次新增码都改这里。
 */

export interface ApiResponse<T = unknown> {
  /** 业务码。约定 200 为成功，其余按失败处理；HTTP 状态码不参与判定 */
  code: number
  message?: string
  /** 业务数据。语义随接口而变，由调用方用泛型指定 */
  detail?: T
}

/**
 * 请求失败时可安全读取的错误载体。
 *
 * 刻意只声明可选字段：axios 拦截器抛出的东西可能是后端信封、也可能是网络错误对象，
 * 两个字段名在两种情况下不一致（`detail` 来自后端，`message` 可能来自 axios 自身），
 * 全写必填会让调用方必须做不必要的类型断言。
 */
export interface ApiErrorPayload {
  /** 后端信封里的错误描述（业务失败时存在） */
  detail?: string
  /** axios / 网络层生成的错误描述 */
  message?: string
}
