import { SendSmsRequest, SendSmsResponse, SmsProvider } from './types';

export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    const timestamp = new Date().toISOString();
    const maskedPhone =
      request.to.length > 6
        ? `${request.to.slice(0, 3)}****${request.to.slice(-4)}`
        : '****';

    console.log('\n========================================');
    console.log(`[SMS Console Provider] ${timestamp}`);
    console.log(`To: ${maskedPhone}`);
    console.log(`Message: "${request.message}"`);
    console.log('========================================\n');

    const messageId = `console-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      messageId,
      providerResponse: JSON.stringify({
        loggedAt: timestamp,
        to: request.to,
        messageLength: request.message.length,
        status: 'delivered_to_console',
      }),
    };
  }
}
