import { Router } from 'express';
import { createTicket } from '../controllers/ticket.controller';

const router = Router();

// POST /api/tickets - 티켓 생성
router.post('/', createTicket);

export default router;