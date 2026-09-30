import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import './App.css'
import {
  deleteNotification,
  receiveNotification,
  sendMessage,
} from './api/greenApi'

type Message = {
  id: string
  text: string
  direction: 'outgoing' | 'incoming'
  timestamp: number
}

function App() {
  const [apiUrl, setApiUrl] = useState('https://4100.api.green-api.com')
  const [idInstance, setIdInstance] = useState('410022751922')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [chatId, setChatId] = useState('412827741')
  const [messageText, setMessageText] = useState('')
  const [contactName, setContactName] = useState('Telegram chat')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('green-api-chat-messages')

    if (!savedMessages) {
      return []
    }

    try {
      return JSON.parse(savedMessages) as Message[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(
      'green-api-chat-messages',
      JSON.stringify(messages),
    )
  }, [messages])

  useEffect(() => {
    if (!apiUrl || !idInstance || !apiTokenInstance || !chatId) {
      return
    }

    let isActive = true

    const pollMessages = async () => {
      while (isActive) {
        try {
          const notification = await receiveNotification({
            apiUrl,
            idInstance,
            apiTokenInstance,
          })

          if (!notification) {
            continue
          }

          const { receiptId, body } = notification

          if (
            body.typeWebhook === 'incomingMessageReceived' &&
            body.senderData?.chatId === chatId &&
            body.messageData?.typeMessage === 'textMessage'
          ) {
            const text =
              body.messageData.textMessageData?.textMessage

            if (body.senderData?.senderName) {
              setContactName(body.senderData.senderName)
            }

            if (text) {
              const messageId =
                body.idMessage ?? crypto.randomUUID()

              setMessages((prev) => {
                const alreadyExists = prev.some(
                  (message) => message.id === messageId,
                )

                if (alreadyExists) {
                  return prev
                }

                return [
                  ...prev,
                  {
                    id: messageId,
                    text,
                    direction: 'incoming',
                    timestamp: Date.now(),
                  },
                ]
              })
            }
          }

          await deleteNotification(
            {
              apiUrl,
              idInstance,
              apiTokenInstance,
            },
            receiptId,
          )
        } catch (err) {
          console.error('Ошибка получения сообщений:', err)

          await new Promise((resolve) => {
            setTimeout(resolve, 2000)
          })
        }
      }
    }

    void pollMessages()

    return () => {
      isActive = false
    }
  }, [apiUrl, idInstance, apiTokenInstance, chatId])

  const handleSendMessage = async (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const trimmedMessage = messageText.trim()

    if (
      !apiUrl ||
      !idInstance ||
      !apiTokenInstance ||
      !chatId ||
      !trimmedMessage
    ) {
      setError('Заполните все поля и введите сообщение')
      return
    }

    setError('')
    setIsSending(true)

    try {
      await sendMessage(
        {
          apiUrl,
          idInstance,
          apiTokenInstance,
        },
        chatId,
        trimmedMessage,
      )

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: trimmedMessage,
          direction: 'outgoing',
          timestamp: Date.now(),
        },
      ])

      setMessageText('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ошибка отправки сообщения',
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([])
    localStorage.removeItem('green-api-chat-messages')
  }

  const formatTime = (timestamp: number) =>
    new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)

  return (
    <main className="app">
      <section className="chat-card">
        <h1>GREEN-API Chat</h1>

        <div className="credentials">
          <label>
            API Url
            <input
              type="text"
              value={apiUrl}
              onChange={(event) =>
                setApiUrl(event.target.value)
              }
              placeholder="Введите apiUrl"
            />
          </label>

          <label>
            ID Instance
            <input
              type="text"
              value={idInstance}
              onChange={(event) =>
                setIdInstance(event.target.value)
              }
              placeholder="Введите idInstance"
            />
          </label>

          <label>
            API Token Instance
            <input
              type="password"
              value={apiTokenInstance}
              onChange={(event) =>
                setApiTokenInstance(event.target.value)
              }
              placeholder="Введите apiTokenInstance"
            />
          </label>

          <label>
            Chat ID получателя
            <input
              type="text"
              value={chatId}
              onChange={(event) =>
                setChatId(event.target.value)
              }
              placeholder="Введите chatId"
            />
          </label>
        </div>

        <div className="chat-header">
          <div>
            <strong>{contactName}</strong>
            <span>Chat ID: {chatId || 'не указан'}</span>
          </div>

          <button
            type="button"
            className="clear-button"
            onClick={handleClearHistory}
            disabled={messages.length === 0}
          >
            Очистить историю
          </button>
        </div>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              Сообщений пока нет
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble ${message.direction}`}
                >
                  <div className="message-text">
                    {message.text}
                  </div>

                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          className="message-form"
          onSubmit={handleSendMessage}
        >
          <input
            type="text"
            placeholder="Введите сообщение..."
            value={messageText}
            onChange={(event) =>
              setMessageText(event.target.value)
            }
          />

          <button type="submit" disabled={isSending}>
            {isSending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
      </section>
    </main>
  )
}

export default App