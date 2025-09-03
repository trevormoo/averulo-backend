// routes/bookings.js
import express from 'express';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Create booking (USER)
router.post('/', auth(true), async (req, res) => {
  const { propertyId, checkIn, checkOut } = req.body;
  if (!propertyId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // req.user.sub should be set by auth() middleware
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Invalid token (no sub)' });

    const booking = await prisma.booking.create({
      data: {
        // use relation connects instead of raw IDs
        property: { connect: { id: propertyId } },
        guest:    { connect: { id: userId } },

        startDate: new Date(checkIn),
        endDate:   new Date(checkOut),
        status: 'PENDING',
      },
    });

    return res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Failed to create booking',
      detail: String(err.message || err),
    });
  }
});

// (optional) list my bookings
router.get('/me', auth(true), async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { guestId: req.user.sub },
    orderBy: { startDate: 'desc' },
    include: { property: { select: { id: true, title: true, city: true } } },
  });
  res.json(bookings);
});

export default router;