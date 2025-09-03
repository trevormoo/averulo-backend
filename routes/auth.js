import express from 'express';
import { completeSignup } from '../controllers/authController.js';
const router = express.Router();

router.post('/complete-signup', completeSignup);

export default router;