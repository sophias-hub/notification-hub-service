import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Initialize dotenv configuration for environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VALID_API_KEY = 'secure-token-123';

// Middleware to automatically parse incoming JSON request bodies
app.use(express.json());

// Allow Swagger UI (and other local clients) to call the API cross-origin.
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  })
);

/**
 * Middleware to authenticate requests using the X-API-Key header.
 * Returns 401 Unauthorized if the key is missing or invalid.
 */
const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey || apiKey !== VALID_API_KEY) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid X-API-Key header.'
    });
    return; // Stop further execution of the request
  }

  next(); // Pass control to the next handler
};

/**
 * @route   GET /api/v1/templates
 * @desc    Returns an array of available mock notification templates
 * @access  Private (Requires X-API-Key)
 */
app.get('/api/v1/templates', authenticateApiKey, (req: Request, res: Response) => {
  const mockTemplates = [
    { id: 'welcome-email', name: 'Welcome Email Template', channel: 'email' },
    { id: 'otp-sms', name: 'One-Time Password SMS', channel: 'sms' },
    { id: 'payment-push', name: 'Payment Success Push Notification', channel: 'push' }
  ];

  res.status(200).json(mockTemplates);
});

/**
 * @route   POST /api/v1/send
 * @desc    Accepts JSON payload to simulate sending a notification
 * @access  Private (Requires X-API-Key)
 */
app.post('/api/v1/send', authenticateApiKey, (req: Request, res: Response) => {
  const { recipient, channel, templateId, templateData } = req.body;

  // Simple input validation for demonstration purposes (400 Bad Request)
  if (!recipient || !channel || !templateId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: recipient, channel, and templateId are required.'
    });
    return;
  }

  // Log successful request processing in the server console/Docker logs
  console.log(`[SUCCESS] Message processed. Channel: ${channel} | Recipient: ${recipient}`);

  // Generate a random message tracking ID for the developer response
  const mockMessageId = `msg-${Math.random().toString(36).substring(2, 11)}`;

  res.status(200).json({
    status: 'success',
    messageId: mockMessageId,
    processedAt: new Date().toISOString()
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Notification Hub server is running locally on http://localhost:${PORT}`);
});

// Export both app and the live server instance for testing purposes
export { app, server };
