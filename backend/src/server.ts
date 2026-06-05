import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireBroadcaster, requireTwitchJwt } from './auth.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requireTwitchJwt);

const todayKey = () => new Date().toISOString().slice(0, 10);

async function activeSeason(channelId: string) {
  let season = await prisma.season.findFirst({
    where: { channelId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!season) {
    season = await prisma.season.create({
      data: {
        channelId,
        name: `Saison ${new Date().getFullYear()}`,
        startsAt: new Date(),
        isActive: true
      }
    });
  }

  return season;
}

async function activeDailyStamp(channelId: string) {
  const settings = await channelSettings(channelId);

  if (settings.activeStampId) {
    const customStamp = await prisma.stamp.findFirst({
      where: {
        id: settings.activeStampId,
        channelId,
        isActive: true
      }
    });

    if (customStamp) return customStamp;
  }

  const season = await activeSeason(channelId);
  const liveKey = todayKey();

  let stamp = await prisma.stamp.findFirst({
    where: { channelId, seasonId: season.id, liveKey, isActive: true }
  });

  if (!stamp) {
    await prisma.stamp.updateMany({
      where: { channelId, isActive: true, kind: 'daily' },
      data: { isActive: false }
    });

    stamp = await prisma.stamp.create({
      data: {
        channelId,
        seasonId: season.id,
        title: `Tampon du ${liveKey}`,
        imageUrl: `/stamps/daily-${new Date().getDay()}.svg`,
        kind: 'daily',
        liveKey,
        isActive: true
      }
    });
  }

  return stamp;
}

async function channelSettings(channelId: string) {
  return prisma.channelSettings.upsert({
    where: { channelId },
    update: {},
    create: { channelId }
  });
}

app.get('/api/passport', async (req, res) => {
  const channelId = req.twitch!.channel_id;
  const viewerKey = req.viewerKey;
  const season = await activeSeason(channelId);
  const settings = await channelSettings(channelId);

  const stamps = viewerKey
    ? await prisma.viewerStamp.findMany({
        where: { channelId, viewerKey, stamp: { seasonId: season.id } },
        include: { stamp: true },
        orderBy: { earnedAt: 'desc' }
      })
    : [];

  const rewards = await prisma.reward.findMany({
    where: { channelId, seasonId: season.id },
    orderBy: { requiredStamps: 'asc' }
  });

  const count = stamps.length;

  res.json({
    season,
    settings,
    count,
    stamps: stamps.map((s) => ({ ...s.stamp, earnedAt: s.earnedAt })),
    rewards: rewards.map((r) => ({ ...r, unlocked: count >= r.requiredStamps }))
  });
});

app.post('/api/checkin', async (req, res) => {
  const channelId = req.twitch!.channel_id;

  if (!req.viewerKey) {
    return res.status(401).json({ error: 'Identité viewer requise' });
  }

  const stamp = await activeDailyStamp(channelId);

  const earned = await prisma.viewerStamp.upsert({
    where: {
      viewerKey_stampId: {
        viewerKey: req.viewerKey,
        stampId: stamp.id
      }
    },
    update: {},
    create: {
      channelId,
      viewerKey: req.viewerKey,
      stampId: stamp.id
    }
  });

  res.json({ ok: true, stamp, earnedAt: earned.earnedAt });
});

app.get('/api/settings', async (req, res) => {
  const channelId = req.twitch!.channel_id;
  const settings = await channelSettings(channelId);
  res.json(settings);
});

app.get('/api/admin', requireBroadcaster, async (req, res) => {
  const channelId = req.twitch!.channel_id;
  const season = await activeSeason(channelId);
  const settings = await channelSettings(channelId);

  const stamps = await prisma.stamp.findMany({
    where: { channelId, seasonId: season.id },
    orderBy: { createdAt: 'desc' }
  });

  const rewards = await prisma.reward.findMany({
    where: { channelId, seasonId: season.id },
    orderBy: { requiredStamps: 'asc' }
  });

  res.json({ season, settings, stamps, rewards });
});

app.post('/api/admin/settings', requireBroadcaster, async (req, res) => {
  const channelId = req.twitch!.channel_id;

  const body = z.object({
    coverColor: z.string(),
    pageColor: z.string(),
    textColor: z.string(),
    buttonColor: z.string(),
    borderColor: z.string()
  }).parse(req.body);

  const settings = await prisma.channelSettings.upsert({
    where: { channelId },
    update: body,
    create: { channelId, ...body }
  });

  res.json(settings);
});

app.post('/api/admin/active-stamp', requireBroadcaster, async (req, res) => {
  const channelId = req.twitch!.channel_id;

  const body = z.object({
    stampId: z.string()
  }).parse(req.body);

  await prisma.stamp.updateMany({
    where: { channelId },
    data: { isActive: false }
  });

  const stamp = await prisma.stamp.update({
    where: { id: body.stampId },
    data: {
      isActive: true,
      liveKey: todayKey()
    }
  });

  await prisma.channelSettings.upsert({
    where: { channelId },
    update: { activeStampId: stamp.id },
    create: { channelId, activeStampId: stamp.id }
  });

  res.json(stamp);
});

app.post('/api/admin/season', requireBroadcaster, async (req, res) => {
  const body = z.object({
    name: z.string().min(2),
    startsAt: z.string().optional(),
    endsAt: z.string().optional().nullable()
  }).parse(req.body);

  const channelId = req.twitch!.channel_id;

  await prisma.season.updateMany({
    where: { channelId, isActive: true },
    data: { isActive: false }
  });

  const season = await prisma.season.create({
    data: {
      channelId,
      name: body.name,
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isActive: true
    }
  });

  res.json(season);
});

app.post('/api/admin/stamps', requireBroadcaster, async (req, res) => {
  const body = z.object({
    title: z.string().min(2),
    imageUrl: z.string().min(1),
    kind: z.enum(['daily', 'custom', 'event']).default('custom'),
    activate: z.boolean().default(false)
  }).parse(req.body);

  const channelId = req.twitch!.channel_id;
  const season = await activeSeason(channelId);

  if (body.activate) {
    await prisma.stamp.updateMany({
      where: { channelId, isActive: true },
      data: { isActive: false }
    });
  }

  const stamp = await prisma.stamp.create({
    data: {
      channelId,
      seasonId: season.id,
      title: body.title,
      imageUrl: body.imageUrl,
      kind: body.kind,
      liveKey: body.activate ? todayKey() : null,
      isActive: body.activate
    }
  });

  if (body.activate) {
    await prisma.channelSettings.upsert({
      where: { channelId },
      update: { activeStampId: stamp.id },
      create: { channelId, activeStampId: stamp.id }
    });
  }

  res.json(stamp);
});

app.post('/api/admin/rewards', requireBroadcaster, async (req, res) => {
  const body = z.object({
    title: z.string().min(2),
    description: z.string().min(2),
    requiredStamps: z.number().int().min(1)
  }).parse(req.body);

  const channelId = req.twitch!.channel_id;
  const season = await activeSeason(channelId);

  const reward = await prisma.reward.create({
    data: {
      channelId,
      seasonId: season.id,
      ...body
    }
  });

  res.json(reward);
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Passport EBS on :${port}`));