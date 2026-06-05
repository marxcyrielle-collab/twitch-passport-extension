import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type TwitchRole = 'viewer' | 'broadcaster' | 'moderator' | 'external';
export type TwitchJwt = {
  exp: number; opaque_user_id?: string; user_id?: string; channel_id: string; role: TwitchRole;
};

declare global { namespace Express { interface Request { twitch?: TwitchJwt; viewerKey?: string } } }

function getSecret() {
  const raw = process.env.TWITCH_EXTENSION_SECRET || 'dev-secret';
  try { return Buffer.from(raw, 'base64'); } catch { return raw; }
}

export function requireTwitchJwt(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token && process.env.NODE_ENV !== 'production') {
    req.twitch = { exp: Date.now()/1000 + 3600, channel_id: req.header('x-dev-channel') || 'dev-channel', role: (req.header('x-dev-role') as TwitchRole) || 'viewer', opaque_user_id: req.header('x-dev-viewer') || 'dev-viewer' };
    req.viewerKey = req.twitch.user_id || req.twitch.opaque_user_id;
    return next();
  }
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as TwitchJwt;
    req.twitch = payload;
    req.viewerKey = payload.user_id || payload.opaque_user_id;
    next();
  } catch {
    res.status(401).json({ error: 'JWT Twitch invalide ou absent' });
  }
}

export function requireBroadcaster(req: Request, res: Response, next: NextFunction) {
  if (req.twitch?.role !== 'broadcaster') return res.status(403).json({ error: 'Réservé au streamer/broadcaster' });
  next();
}
