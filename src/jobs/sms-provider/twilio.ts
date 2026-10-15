import { SendSmsRequest, SendSmsResponse, SmsProvider, SmsProviderConfig } from './types';

export interface TwilioConfig extends SmsProviderConfig {
  accountSid?: string;
}

export class TwilioProvider implements SmsProvider {
  readonly name = 'twilio';
  private config: TwilioConfig;
  private accountSid: string;
  private authToken: string;

  constructor(config: TwilioConfig) {
    this.config = config;
    this.accountSid = config.accountSid || process.env.SMS_ACCOUNT_SID || '';
    this.authToken = config.apiKey;
  }

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      if (!this.accountSid || !this.authToken) {
        return {
          success: false,
          error: 'Twilio configuration incomplete: accountSid and apiKey (authToken) are required',
        };
      }

      // Ensure E.164 phone format for Twilio (starts with +)
      let to = request.to.trim();
      if (!to.startsWith('+')) {
        const cleaned = to.replace(/\D/g, '');
        to = cleaned.startsWith('88') ? `+${cleaned}` : `+88${cleaned}`;
      }

      const endpoint =
        this.config.baseUrl ||
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const formData = new URLSearchParams({
        To: to,
        From: this.config.senderId,
        Body: request.message,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (response.ok && (response.status === 200 || response.status === 201)) {
        const messageId = (responseData.sid as string) || undefined;
        return {
          success: true,
          messageId,
          providerResponse: responseText,
        };
      }

      const errorMessage =
        (responseData.message as string | undefined) ||
        `Twilio API error HTTP ${response.status}: ${responseText}`;

      return {
        success: false,
        error: errorMessage,
        providerResponse: responseText,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Twilio network error: ${errorMsg}`,
      };
    }
  }
}
