/**
 * 收件箱实时通道：把 WS 推送的文件增减/进度统一折算成 collectionStore 变更。
 * 多人同开投递页与查看页时轮询既滞后又翻倍请求，故消息只在这里解包一次。
 *
 * 边界：重连有上限且仅当仍是同一 collectionCode 才重连；disconnect 必须先置空
 * onclose 再 close，否则主动断开会被当成掉线又拉起重连。
 * 刻意不做：非 JSON 消息静默忽略，也不在组件里维护第二份在线用户列表。
 */
import { ref, onUnmounted } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { buildWebSocketUrl } from '@/utils/share-url'
import type { CollectionWSMessage } from '@/types/collection'

interface UseCollectionWebSocketOptions {
  /** 自动重连间隔（毫秒），默认 3000 */
  reconnectInterval?: number
  /** 最大重连次数，默认 5 */
  maxReconnectAttempts?: number
}

export function useCollectionWebSocket(options: UseCollectionWebSocketOptions = {}) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 5 } = options

  const collectionStore = useCollectionStore()
  const isConnected = ref(false)
  const reconnectAttempts = ref(0)
  const lastMessage = ref<CollectionWSMessage | null>(null)
  const onlineUsers = ref<string[]>([])

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  /** 构建 WebSocket URL */
  function buildWSUrl(code: string): string {
    return buildWebSocketUrl(`/ws/collection/${code}`)
  }

  /** 连接 WebSocket */
  function connect(code: string, nickname?: string) {
    disconnect()

    const url = buildWSUrl(code)
    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected.value = true
      reconnectAttempts.value = 0
      // 发送加入消息（含昵称）
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'join', nickname: nickname || '' }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg: CollectionWSMessage = JSON.parse(event.data)
        lastMessage.value = msg
        handleMessage(msg)
      } catch {
        // 忽略非JSON消息
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      // 自动重连
      if (reconnectAttempts.value < maxReconnectAttempts && collectionStore.collectionCode === code) {
        reconnectTimer = setTimeout(() => {
          reconnectAttempts.value++
          connect(code, nickname)
        }, reconnectInterval)
      }
    }

    ws.onerror = () => {
      isConnected.value = false
    }
  }

  /** 处理收到的消息 */
  function handleMessage(msg: CollectionWSMessage) {
    switch (msg.type) {
      case 'file_completed':
        if (msg.file_id !== undefined) {
          collectionStore.addFileFromWS({
            id: msg.file_id,
            file_name: msg.filename || '',
            file_size: msg.file_size || 0,
            uploader_name: msg.uploader || '',
            status: 'completed',
            created_at: new Date().toISOString(),
          })
          // 移除对应的上传进度（优先用 file_id）
          collectionStore.removeUploadProgress(msg.file_id, msg.filename || '', msg.uploader || '')
        }
        break
      case 'file_deleted':
        if (msg.file_id !== undefined) {
          collectionStore.removeFileFromWS(msg.file_id)
        }
        break
      case 'file_uploading':
        // 后端广播的上传开始状态
        collectionStore.updateUploadProgress({
          fileId: msg.file_id,
          filename: msg.filename || '',
          progress: 0,
          uploader: msg.uploader || '',
        })
        break
      case 'file_progress':
        // 投递页面发送的实时进度
        collectionStore.updateUploadProgress({
          filename: msg.filename || '',
          progress: msg.progress || 0,
          uploader: msg.uploader || '',
        })
        break
      case 'file_delivery_failed':
        // 上传失败，移除进度
        collectionStore.removeUploadProgress(msg.file_id, msg.filename || '', msg.uploader || '')
        if (msg.file_id !== undefined) {
          collectionStore.updateFileStatus(msg.file_id, 'failed')
        }
        break
      case 'user_joined':
      case 'user_left':
        if (msg.online_users) {
          onlineUsers.value = msg.online_users
        }
        break
    }
  }

  /** 断开连接 */
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.onclose = null // 防止触发重连
      ws.close()
      ws = null
    }
    isConnected.value = false
    onlineUsers.value = []
  }

  /** 发送心跳 */
  function sendHeartbeat() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send('ping')
    }
  }

  /** 发送自定义消息 */
  function send(data: object | string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }

  // 组件卸载时自动断开
  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    reconnectAttempts,
    lastMessage,
    onlineUsers,
    connect,
    disconnect,
    sendHeartbeat,
    send,
  }
}
