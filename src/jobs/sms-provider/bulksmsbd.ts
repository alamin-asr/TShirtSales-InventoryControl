import { SendSmsRequest, SendSmsResponse, SmsProvider, SmsProviderConfig } from './types';

export class BulkSmsBdProvider implements SmsProvider {
  readonly name = 'bulksmsbd';
  private config: SmsProviderConfig;

  constructor(config: SmsProviderConfig) {
    this.config = config;
  }

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      // Normalize recipient number: 11-digit BD number or with 88 prefix
      let number = request.to.replace(/\D/g, '');
      if (number.startsWith('01') && number.length === 11) {
        number = '88' + number;
      }

      const endpoint = this.config.baseUrl || 'https://bulksmsbd.net/api/smsapi';

      const formData = new URLSearchParams({
        api_key: this.config.apiKey,
        senderid: this.config.senderId,
        number,
        message: request.message,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
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

      // BulkSMSBD standard success response code is 202
      // Example: { "response_code": 202, "message_id": 12345, "success_message": "SMS Submitted Successfully" }
      const responseCode = Number(responseData.response_code);
      const isSuccess =
        response.ok &&
        (responseCode === 202 ||
          String(responseData.success_message || '').toLowerCase().includes('success'));

      const messageId = responseData.message_id ? String(responseData.message_id) : undefined;

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
        `BulkSMSBD error (Code: ${responseCode || response.status}): ${responseText}`;

      return {
        success: false,
        error: errorMessage,
        providerResponse: responseText,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `BulkSMSBD network error: ${errorMsg}`,
      };
    }
  }
}
