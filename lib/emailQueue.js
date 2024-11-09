const Queue = require('bull');
const emailService = require('./emailService');
require('dotenv').config();

const emailQueue = new Queue('emailQueue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  limiter: {
    max: 10,
    duration: 1000,
  },
});

emailQueue.process(async (job) => {
  console.log(`Processing job ${job.id} for ${job.data.to}`);
  try {
    const { to, subject, text, html } = job.data;
    const emailOptions = { from: process.env.MAIL_USER, to, subject, text, html };
    await emailService.sendEmail(emailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    if (job.attemptsMade < 3) throw error;
  }
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});

module.exports = emailQueue;