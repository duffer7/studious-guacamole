export type PushPayloadType = 'message' | 'call' | 'missed-call' | 'call-dismiss';

export interface PushPayload {
  type: PushPayloadType;
  title: string;
  body: string;
  chatId?: number;
  messageId?: number;
  callId?: string;
  tag?: string;
  ts: number;
}
