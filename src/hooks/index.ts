/**
 * 通用 UI 层 hooks 的统一出口（目前为空）。
 *
 * ## 为什么这个文件夹是空的却还留着
 * 它与 `src/composables/` 的分工是刻意的：composables 承载**业务流程**
 * （发送请求、编排状态、依赖 store），hooks 只放与业务无关的通用能力
 * （事件监听、防抖、点击外部关闭等）。如果没有业务含义，就不该进 composables。
 *
 * ## 刻意不做
 * 不用 re-export 把 composables 再转发一层：多一层出口会让依赖图失真，
 * 页面应直接从 `@/composables` 引入。
 *
 * 下面的 export {} 不能删：否则本文件会被 TS 当作全局脚本，
 * export 出去的名字会污染全局作用域。
 */

// 自定义 Vue hooks 导出文件
// 这里可以导出所有自定义的 Vue hooks

// 示例：导出常用的自定义 hooks
// export { useLocalStorage } from './useLocalStorage'
// export { useDebounce } from './useDebounce'
// export { useThrottle } from './useThrottle'
// export { useEventListener } from './useEventListener'
// export { useClickOutside } from './useClickOutside'

// 目前项目中的业务逻辑已经通过 composables 进行了封装
// hooks 文件夹主要用于存放更通用的、可复用的 Vue hooks

export {}