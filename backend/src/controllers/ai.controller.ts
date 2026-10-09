import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai/ai.service.js';
import { AppError } from '../middleware/errorHandler.js';

export class AiController {
  public static async explainRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const recordId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await AiService.explainRecord(
        recordId,
        { userId: req.user.userId, role: req.user.role },
        req.requestId || 'unknown'
      );

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
        res.status(503).json({
          status: 'AI_UNAVAILABLE',
          error: 'AI_UNAVAILABLE',
          message: 'AI assistant is currently unavailable: OPENAI_API_KEY is not configured or reachable',
          requestId: req.requestId || 'unknown',
          statusCode: 503,
        });
        return;
      }
      next(err);
    }
  }

  public static async compareRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const { recordIdA, recordIdB } = req.body;
      if (!recordIdA || !recordIdB) {
        throw new AppError('recordIdA and recordIdB are required for comparison', 400);
      }

      const result = await AiService.compareRecords(
        recordIdA,
        recordIdB,
        { userId: req.user.userId, role: req.user.role },
        req.requestId || 'unknown'
      );

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
        res.status(503).json({
          status: 'AI_UNAVAILABLE',
          error: 'AI_UNAVAILABLE',
          message: 'AI assistant is currently unavailable: OPENAI_API_KEY is not configured or reachable',
          requestId: req.requestId || 'unknown',
          statusCode: 503,
        });
        return;
      }
      next(err);
    }
  }

  public static async explainTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const { patientId } = req.body;
      const targetPatientId = patientId || req.user.userId;

      const result = await AiService.explainTimeline(
        targetPatientId,
        { userId: req.user.userId, role: req.user.role },
        req.requestId || 'unknown'
      );

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
        res.status(503).json({
          status: 'AI_UNAVAILABLE',
          error: 'AI_UNAVAILABLE',
          message: 'AI assistant is currently unavailable: OPENAI_API_KEY is not configured or reachable',
          requestId: req.requestId || 'unknown',
          statusCode: 503,
        });
        return;
      }
      next(err);
    }
  }

  public static async translateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const recordId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const { targetLanguage } = req.body;
      if (!targetLanguage || typeof targetLanguage !== 'string') {
        throw new AppError('targetLanguage is required for translation', 400);
      }

      const result = await AiService.translateRecord(
        recordId,
        targetLanguage,
        { userId: req.user.userId, role: req.user.role },
        req.requestId || 'unknown'
      );

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
        res.status(503).json({
          status: 'AI_UNAVAILABLE',
          error: 'AI_UNAVAILABLE',
          message: 'AI translation is currently unavailable: OPENAI_API_KEY is not configured or reachable',
          requestId: req.requestId || 'unknown',
          statusCode: 503,
        });
        return;
      }
      next(err);
    }
  }

  public static async parseVoiceIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        throw new AppError('transcript is required for voice intent parsing', 400);
      }

      const result = await AiService.parseVoiceIntent(
        transcript,
        { userId: req.user.userId, role: req.user.role },
        req.requestId || 'unknown'
      );

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
        res.status(503).json({
          status: 'AI_UNAVAILABLE',
          error: 'AI_UNAVAILABLE',
          message: 'Voice assistant is currently unavailable: OPENAI_API_KEY is not configured or reachable',
          requestId: req.requestId || 'unknown',
          statusCode: 503,
        });
        return;
      }
      next(err);
    }
  }
}

