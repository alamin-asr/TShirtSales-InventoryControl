import { SendSmsRequest, SendSmsResponse, SmsProvider, SmsProviderConfig } from './types';

export class SslWirelessProvider implements SmsProvider {
  readonly name = 'ssl-wireless';
  private config: SmsProviderConfig;

  constructor(config: SmsProviderConfig) {
    this.config = config;
  }

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      let msisdn = request.to.replace(/\D/g, '');
      if (msisdn.startsWith('01') && msisdn.length === 11) {
        msisdn = '88' + msisdn;
      }

      const csmsId = `CSMS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const endpoint = this.config.baseUrl || 'https://smsplus.sslwireless.com/api/v3/send-sms';

      const payload = {
        api_token: this.config.apiKey,
        sid: this.config.senderId,
        msisdn,
        sms: request.message,
        csms_id: csmsId,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      const isSuccess =
        response.ok &&
        (responseData.status === 'SUCCESS' ||
          responseData.status_code === 200 ||
          (Array.isArray(responseData.smsinfo) &&
            (responseData.smsinfo[0] as Record<string, unknown>)?.sms_status === 'SUCCESS'));

      const messageId =
        (Array.isArray(responseData.smsinfo) &&
          ((responseData.smsinfo[0] as Record<string, unknown>)?.reference_id as string | undefined)) ||
        csmsId;

      if (isSuccess) {
        return {
          success: true,
          messageId,
          providerResponse: responseText,
        };
      }

      const errorMessage =
        (responseData.error_message as string | undefined) ||
        (responseData.message as string | undefined) ||
        `SSL Wireless API request failed with HTTP ${response.status}`;

      return {
        success: false,
        error: errorMessage,
        providerResponse: responseText,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `SSL Wireless network error: ${errorMsg}`,
      };
    }
  }
}
