// routes/properties.js
import express from 'express';
import { auth, requireRole } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// GET /api/properties?city=&status=ACTIVE&page=1&limit=10
router.get('/', async (req, res) => {
  const { city, status = 'ACTIVE', page = 1, limit = 10 } = req.query;

  const where = {
    ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    ...(status ? { status } : {}),
  };
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { host: { select: { id: true, email: true, name: true } } },
    }),
    prisma.property.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), limit: take });
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  const prop = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: { host: { select: { id: true, email: true, name: true } } },
  });
  if (!prop) return res.status(404).json({ error: 'Not found' });
  res.json(prop);
});

// POST /api/properties (HOST or ADMIN)
router.post('/', auth(true), requireRole('ADMIN', 'HOST'), async (req, res) => {
  const { title, city, lat, lng, nightlyPrice, status = 'ACTIVE' } = req.body;
  if (!title || !city || nightlyPrice == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const created = await prisma.property.create({
    data: {
      title,
      city,
      lat,
      lng,
      nightlyPrice: Number(nightlyPrice),
      status,
      host: { connect: { id: req.user.id } }, // ✅ this must be defined
    },
  });

  res.status(201).json(created);
});

export default router;