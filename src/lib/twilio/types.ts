export type CallSid = string;

export type CreateCallInput = {
  to: string;
  from?: string;
  /** TwiML を返すコールバック URL。空ならアプリの /api/twilio/voice を使う想定。 */
  webhookUrl?: string;
  /** Interview.id を埋め込む。Status callback と紐付けに使う。 */
  interviewId: string;
};

export type CreateCallResult = {
  callSid: CallSid;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  provider: string;
};

export interface TwilioVoiceClient {
  readonly name: string;
  createCall(input: CreateCallInput): Promise<CreateCallResult>;
}
