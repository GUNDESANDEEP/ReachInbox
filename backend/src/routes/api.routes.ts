import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { SlackController } from '../controllers/slack.controller';
import { QueueController } from '../controllers/queue.controller';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Schedule & Email routes
router.post('/schedule', ScheduleController.createSchedule);
router.get('/emails/scheduled', ScheduleController.getScheduledEmails);
router.get('/emails/sent', ScheduleController.getSentEmails);
router.get('/emails/search', ScheduleController.searchEmails);
router.get('/emails/elasticsearch-status', ScheduleController.getElasticsearchStatus);
router.delete('/emails/:id', ScheduleController.cancelScheduledEmail);
router.post('/config/smtp', ScheduleController.updateSmtpConfig);

// Slack integration routes
router.post('/slack/connect', SlackController.connectSlack);
router.post('/slack/disconnect', SlackController.disconnectSlack);
router.post('/slack/test', SlackController.testSlackAlert);

// Queue metrics routes
router.get('/queue/stats', QueueController.getQueueStats);

// Auth routes
router.post('/auth/send-otp', AuthController.sendOtp);
router.post('/auth/verify-otp', AuthController.verifyOtp);
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/google', AuthController.googleLogin);
router.get('/auth/me', AuthController.getMe);

export default router;
