declare global { interface Window { Twitch?: any } }
export type TwitchAuth = { token: string; channelId: string; clientId: string; userId?: string; opaqueUserId?: string };
export function onTwitchAuth(cb: (auth: TwitchAuth) => void) {
  const helper = window.Twitch?.ext;
  if (!helper) {
    cb({ token: '', channelId: 'dev-channel', clientId: 'dev-client', opaqueUserId: 'dev-viewer' });
    return;
  }
  helper.onAuthorized((auth: any) => cb({ token: auth.token, channelId: auth.channelId, clientId: auth.clientId, userId: auth.userId, opaqueUserId: auth.opaqueUserId }));
}
export async function api(path: string, auth: TwitchAuth, options: RequestInit = {}) {
  const res = await fetch(`${import.meta.env.VITE_EBS_URL || 'http://localhost:3001'}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}`, ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
