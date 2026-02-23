import express from 'express';
import cors from 'cors';
import type { Response } from 'express';
import ApiResponse from './utils/ApiResponse';
import { globalErrorHandler } from './middleware/ErrorHandler';
import { metricsEndpoint, metricsMiddleware } from './middleware/observability';
import { requestLogger } from './configs/observability';

const app = express();

app.use(cors());
app.use(express.json());

app.use(requestLogger);
app.use(metricsMiddleware);

app.get('/metrics', metricsEndpoint);

app.get('/health', (_, res: Response) => {
  ApiResponse.success(res, 200, 'Healthy');
});

app.use((_, res: Response) => {
  ApiResponse.error(res, 404, 'Route not found');
});

app.use(globalErrorHandler);

export { app };
