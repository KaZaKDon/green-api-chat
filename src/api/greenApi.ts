export type GreenApiCredentials = {
    apiUrl: string
    idInstance: string
    apiTokenInstance: string
}

export type GreenApiNotification = {
    receiptId: number
    body: {
        typeWebhook: string
        idMessage?: string
        senderData?: {
            chatId?: string
            senderName?: string
            chatName?: string
        }
        messageData?: {
            typeMessage?: string
            textMessageData?: {
                textMessage?: string
            }
        }
    }
}

export async function sendMessage(
    credentials: GreenApiCredentials,
    chatId: string,
    message: string,
) {
    const { apiUrl, idInstance, apiTokenInstance } = credentials

    const response = await fetch(
        `${apiUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId,
                message,
            }),
        },
    )

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Не удалось отправить сообщение')
    }

    return response.json()
}

export async function receiveNotification(
    credentials: GreenApiCredentials,
): Promise<GreenApiNotification | null> {
    const { apiUrl, idInstance, apiTokenInstance } = credentials

    const response = await fetch(
        `${apiUrl}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}?receiveTimeout=5`,
    )

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Не удалось получить уведомление')
    }

    const text = await response.text()

    if (!text) {
        return null
    }

    return JSON.parse(text) as GreenApiNotification
}

export async function deleteNotification(
    credentials: GreenApiCredentials,
    receiptId: number,
) {
    const { apiUrl, idInstance, apiTokenInstance } = credentials

    const response = await fetch(
        `${apiUrl}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`,
        {
            method: 'DELETE',
        },
    )

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Не удалось удалить уведомление')
    }
}