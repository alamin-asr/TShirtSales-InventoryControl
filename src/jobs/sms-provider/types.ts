export interface SmsProviderConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

export interface SendSmsRequest {
  to: string;
  message: string;
}

export interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: string;
}

export interface SmsProvider {
  name: string;
  send(request: SendSmsRequest): Promise<SendSmsResponse>;
}
