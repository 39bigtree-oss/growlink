import "server-only";

import { randomBytes } from "node:crypto";

import type { CreateCallInput, CreateCallResult, TwilioVoiceClient } from "./types";

let cached: TwilioVoiceClient | null = null;

/**
 * 課金回避モック。実電話は出さず、callSid 風の文字列だけ返す。
 * Twilio status callback は管理側 simulator から手動で叩く形でもよい。
 */
const mockTwilio: TwilioVoiceClient = {
  name: "mock",
  async createCall(input: CreateCallInput): Promise<CreateCallResult> {
    const callSid = `CAmock${randomBytes(8).toString("hex")}`;
    console.log("[twilio:mock] create call", {
      to: input.to.replace(/.(?=.{4})/g, "*"),
      interviewId: input.interviewId,
      callSid,
    });
    return { callSid, status: "queued", provider: "mock" };
  },
};

function createTwilioVoiceProvider(): TwilioVoiceClient {
  // 実 Twilio に切り替える場合は TWILIO_PROVIDER=twilio + TWILIO_* env を要求。
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_NUMBER;
  if (!sid || !token || !from) {
    throw new Error(
      "Twilio provider requires TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_NUMBER",
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilioMod = require("twilio") as unknown as (sid: string, token: string) => ReturnType<typeof import("twilio")>;
  const client = twilioMod(sid, token);
  return {
    name: "twilio",
    async createCall(input: CreateCallInput): Promise<CreateCallResult> {
      const baseUrl =
        input.webhookUrl ??
        `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/twilio/voice?interviewId=${encodeURIComponent(input.interviewId)}`;
      const call = await client.calls.create({
        to: input.to,
        from: input.from ?? from!,
        url: baseUrl,
        statusCallback: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/twilio/status?interviewId=${encodeURIComponent(input.interviewId)}`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });
      return {
        callSid: call.sid,
        status: (call.status as CreateCallResult["status"]) ?? "queued",
        provider: "twilio",
      };
    },
  };
}

export function getTwilioVoiceClient(): TwilioVoiceClient {
  if (cached) return cached;
  const choice = process.env.TWILIO_PROVIDER ?? "mock";
  cached = choice === "twilio" ? createTwilioVoiceProvider() : mockTwilio;
  return cached;
}

export function __resetTwilioClientForTests(): void {
  cached = null;
}
