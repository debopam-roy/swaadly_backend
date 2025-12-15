import { registerAs } from '@nestjs/config';

export default registerAs('fast2sms', () => ({
  apiKey: process.env.FAST2SMS_API_KEY || '',
  senderId: process.env.FAST2SMS_SENDER_ID || 'SWAADLY',
  apiUrl: 'https://www.fast2sms.com/dev/bulkV2',
  route: 'dlt',
  // DLT template message ID (optional, if required by Fast2SMS)
  templateId: process.env.FAST2SMS_TEMPLATE_ID || '',
}));
