import { normalizePhone, smsProvider } from '../config';

export async function sendSms(toPhone: string, message: string): Promise<{ ok: boolean; provider: string; error?: string }> {
  const phone = normalizePhone(toPhone);
  if (phone.length !== 10) {
    return { ok: false, provider: 'invalid', error: 'Invalid phone number' };
  }

  const provider = smsProvider();

  if (provider === 'console') {
    console.info('[SMS:console]', phone, message);
    return { ok: true, provider: 'console' };
  }

  if (provider === 'msg91') {
    return sendMsg91(phone, message);
  }

  return sendTwilio(phone, message);
}

async function sendMsg91(phone: string, message: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER_ID ?? 'LNCHBX';
  if (!authKey) {
    console.warn('[SMS] MSG91_AUTH_KEY missing');
    return { ok: false, provider: 'msg91', error: 'MSG91 not configured' };
  }

  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      template_id: process.env.MSG91_OTP_TEMPLATE_ID,
      short_url: '0',
      recipients: [{ mobiles: `91${phone}`, var: message }],
    }),
  }).catch((error: Error) => ({ ok: false, error }));

  if (response instanceof Response && response.ok) {
    return { ok: true, provider: 'msg91' };
  }

  const fallback = await fetch('https://api.msg91.com/api/sendhttp.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      authkey: authKey,
      mobiles: `91${phone}`,
      message,
      sender,
      route: '4',
      country: '91',
    }).toString(),
  });

  if (!fallback.ok) {
    const text = await fallback.text();
    return { ok: false, provider: 'msg91', error: text };
  }

  return { ok: true, provider: 'msg91' };
}

async function sendTwilio(phone: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.warn('[SMS] Twilio credentials missing');
    return { ok: false, provider: 'twilio', error: 'Twilio not configured' };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `+91${phone}`,
      From: from,
      Body: message,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, provider: 'twilio', error: text };
  }

  return { ok: true, provider: 'twilio' };
}

export async function sendLoginOtpSms(phone: string, otp: string): Promise<{ ok: boolean; provider: string; error?: string }> {
  return sendSms(phone, `Your LunchFlow login OTP is ${otp}. Valid for 10 minutes. Do not share this code.`);
}
