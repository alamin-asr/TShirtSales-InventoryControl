import { SmsProvider } from './types';
import { SslWirelessProvider } from './ssl-wireless';
import { BulkSmsBdProvider } from './bulksmsbd';
import { TwilioProvider } from './twilio';
import { ConsoleSmsProvider } from './console';

export * from './types';
export * from './ssl-wireless';
export * from './bulksmsbd';
export * from './twilio';
export * from './console';

/**
 * Returns an SMS provider instance based on SMS_PROVIDER environment variable.
 * Supported values: 'ssl-wireless', 'bulksmsbd', 'twilio', 'console' (default).
 */
export function getSmsProvider(): SmsProvider {
  const providerType = (process.env.SMS_PROVIDER || 'console').toLowerCase().trim();
  const apiKey = process.env.SMS_API_KEY || '';
  const senderId = process.env.SMS_SENDER_ID || '';
  const accountSid = process.env.SMS_ACCOUNT_SID || '';

  switch (providerType) {
    case 'ssl-wireless':
    case 'sslwireless':
      return new SslWirelessProvider({
        apiKey,
        senderId,
      });

    case 'bulksmsbd':
    case 'bulk-sms-bd':
      return new BulkSmsBdProvider({
        apiKey,
        senderId,
      });

    case 'twilio':
      return new TwilioProvider({
        apiKey,
        senderId,
        accountSid,
      });

    case 'console':
    default:
      return new ConsoleSmsProvider();
  }
}
