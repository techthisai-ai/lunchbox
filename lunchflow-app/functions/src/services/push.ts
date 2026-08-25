type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendExpoPush(
  expoPushToken: string,
  payload: PushPayload,
): Promise<{ ok: boolean; error?: string }> {
  if (!expoPushToken.startsWith('ExponentPushToken') && !expoPushToken.startsWith('ExpoPushToken')) {
    return { ok: false, error: 'Invalid Expo push token' };
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      priority: 'high',
      channelId: 'order-updates',
      collapseId: payload.data?.orderId
        ? `lunchbox-${payload.data.status ?? 'update'}-${payload.data.orderId}`
        : undefined,
    }),
  });

  const result = (await response.json()) as {
    data?: { status?: string; message?: string } | { status?: string; message?: string }[];
    errors?: { message?: string }[];
  };
  const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!response.ok || ticket?.status === 'error') {
    return {
      ok: false,
      error: ticket?.message ?? result.errors?.[0]?.message ?? response.statusText,
    };
  }

  return { ok: true };
}
