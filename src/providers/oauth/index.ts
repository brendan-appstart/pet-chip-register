/**
 * OAuth sign-in behind a provider interface (currently Google). Uses the
 * authorization-code flow: we send the user to the provider, receive a `code`
 * on our callback, exchange it server-side for tokens, and read the user's
 * verified email. If credentials are unset the provider is disabled and only
 * magic-link sign-in is offered.
 */
export interface OAuthUserInfo {
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface OAuthProvider {
  readonly name: string;
  readonly enabled: boolean;
  buildAuthUrl(params: { state: string; redirectUri: string }): string;
  exchangeCode(params: { code: string; redirectUri: string }): Promise<OAuthUserInfo>;
}

export function createDisabledOAuthProvider(): OAuthProvider {
  const off = (): never => {
    throw new Error('OAuth is not configured.');
  };
  return { name: 'disabled', enabled: false, buildAuthUrl: off, exchangeCode: off };
}

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';

export function createGoogleOAuthProvider(opts: {
  clientId: string;
  clientSecret: string;
}): OAuthProvider {
  return {
    name: 'google',
    enabled: true,

    buildAuthUrl({ state, redirectUri }) {
      const params = new URLSearchParams({
        client_id: opts.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
        prompt: 'select_account',
      });
      return `${GOOGLE_AUTH}?${params.toString()}`;
    },

    async exchangeCode({ code, redirectUri }) {
      const tokenRes = await fetch(GOOGLE_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: opts.clientId,
          client_secret: opts.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenRes.ok) {
        throw new Error(`Google token exchange failed: ${tokenRes.status}`);
      }
      const token = (await tokenRes.json()) as { access_token?: string };
      if (!token.access_token) throw new Error('Google token response missing access_token');

      const infoRes = await fetch(GOOGLE_USERINFO, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!infoRes.ok) throw new Error(`Google userinfo failed: ${infoRes.status}`);
      const info = (await infoRes.json()) as {
        email?: string;
        email_verified?: boolean;
        name?: string;
      };
      if (!info.email) throw new Error('Google userinfo missing email');
      return { email: info.email, emailVerified: info.email_verified === true, name: info.name };
    },
  };
}
