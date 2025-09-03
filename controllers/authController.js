import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const completeSignup = async (req, res) => {
  const { email, name, dob } = req.body;
  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          dob: dob ? new Date(dob) : null,
          role: 'USER',
        },
      });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
};