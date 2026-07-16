/**
 * SMS is out of scope for the walking-skeleton MVP, but the interface exists so
 * that owner alerts and lost-mode notifications can add an SMS channel later
 * without touching call sites. The default is a no-op that records intent.
 */
export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsProvider {
  readonly name: string;
  readonly enabled: boolean;
  send(message: SmsMessage): Promise<{ id: string }>;
}

export function createNoopSmsProvider(): SmsProvider {
  return {
    name: 'noop',
    enabled: false,
    async send() {
      throw new Error('SMS provider is not configured (SMS is not enabled in this build).');
    },
  };
}
