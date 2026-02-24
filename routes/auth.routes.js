import express from 'express';
import { deleteProfile, getProfile, login, logout, signup, updateProfile } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/profile', deleteProfile);

export default router;