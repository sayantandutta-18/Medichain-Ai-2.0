import { z } from 'zod';
import { env } from '../../config/env.js';
import { MedicalRecord } from '../../models/MedicalRecord.js';
import { can, PolicyActor } from '../../policy/policy.js';
import { decrypt } from '../../utils/crypto.js';
import { AuditService } from '../audit.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  EXPLAIN_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  TIMELINE_SYSTEM_PROMPT,
  TRANSLATE_SYSTEM_PROMPT,
  VOICE_SYSTEM_PROMPT,
  buildExplanationUserPrompt,
  buildComparisonUserPrompt,
  buildTimelineUserPrompt,
  buildTranslationUserPrompt,
  buildVoiceUserPrompt,
  redactDirectIdentifiers,
} from './prompts/explain.js';

export const aiExplanationSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  keyFindings: z.array(z.string()).default([]),
  patientFriendlyExplanation: z.string().min(1, 'Explanation is required'),
  terminology: z
    .array(
      z.object({
        term: z.string().min(1),
        meaning: z.string().min(1),
      })
    )
    .default([]),
  questionsForClinician: z.array(z.string()).default([]),
  disclaimer: z.string().min(1, 'Disclaimer is required'),
});

export const aiComparisonSchema = z.object({
  differences: z.array(
    z.object({
      field: z.string().min(1),
      status: z.enum(['changed', 'new', 'missing']),
      detail: z.string().min(1),
    })
  ),
  summary: z.string().min(1),
  disclaimer: z.string().min(1),
});

export const aiTimelineSchema = z.object({
  chronology: z.array(
    z.object({
      dateOrPeriod: z.string().min(1),
      eventTitle: z.string().min(1),
      findingsOverview: z.string().min(1),
    })
  ),
  summary: z.string().min(1),
  disclaimer: z.string().min(1),
});

export const aiTranslationSchema = z.object({
  targetLanguage: z.string().min(1),
  translatedTitle: z.string().min(1),
  translatedSummary: z.string().min(1),
  translatedFindings: z.array(z.string()).default([]),
  translatedTerminology: z
    .array(
      z.object({
        term: z.string().min(1),
        translation: z.string().min(1),
      })
    )
    .default([]),
  disclaimer: z.string().min(1),
});

export const aiVoiceIntentSchema = z.object({
  intent: z.enum([
    'SCHEDULE_APPOINTMENT',
    'LOG_VITAL',
    'SEARCH_RECORDS',
    'VIEW_MEDICATIONS',
    'CHECK_INTERACTIONS',
    'UNKNOWN',
  ]),
  naturalLanguageSummary: z.string().min(1),
  requiresConfirmation: z.boolean(),
  previewData: z.record(z.any()).default({}),
  disclaimer: z.string().min(1),
});

export type AiExplanation = z.infer<typeof aiExplanationSchema>;

export interface AiExplanationResult {
  status: 'SUCCESS' | 'COULD_NOT_GENERATE' | 'AI_UNAVAILABLE';
  explanation?: AiExplanation;
  message?: string;
  disclaimer: string;
}

export type LlmProviderFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

export class AiService {
  private static defaultDisclaimer =
    'AI-generated educational explanation only. Not a medical diagnosis. Please review and verify with your qualified clinician.';

  /**
   * Calls OpenAI Chat Completions API with strict timeouts.
   */
  private static async callOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'mock-or-placeholder-key' || apiKey === 'dummy_openai_api_key') {
      const err = new AppError('AI provider unavailable: OPENAI_API_KEY is not configured', 503);
      (err as any).status = 503;
      (err as any).code = 'AI_UNAVAILABLE';
      throw err;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new AppError(`OpenAI API error: ${res.statusText}`, 503);
      }

      const data = (await res.json()) as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI provider');
      }
      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new AppError('AI request timed out after 15 seconds', 504);
      }
      if (err instanceof AppError) throw err;
      throw new AppError('AI provider unavailable', 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Explains record contents with policy authorization, PII redaction, schema validation, and audit trail.
   */
  public static async explainRecord(
    recordId: string,
    actor: PolicyActor,
    requestId: string = 'unknown',
    customProvider?: LlmProviderFn
  ): Promise<AiExplanationResult> {
    // 1. Fetch record
    const record = await MedicalRecord.findOne({ _id: recordId, deletedAt: null });
    if (!record) {
      throw new AppError('Medical record not found', 404);
    }

    // 2. Run policy check first (patient owner or approved doctor with VIEW/FULL consent)
    const allowed = await can(actor, 'record:read', {
      recordPatientId: record.patientId.toString(),
    });
    if (!allowed) {
      throw new AppError('Unauthorized: Access denied to record for AI explanation', 403);
    }

    // 3. Decrypt record in memory (never logged, never saved unencrypted)
    const aad = `${record._id.toString()}|${record.patientId.toString()}`;
    let documentText = '';
    try {
      const decryptedBytes = decrypt(record.encryptedPayload, aad);
      documentText = decryptedBytes.toString('utf-8');
    } catch {
      throw new AppError('Decryption failed while preparing record for analysis', 500);
    }

    // 4. Redact direct identifiers (name, phone, email, address patterns)
    const redactedText = redactDirectIdentifiers(documentText);

    // 5. Build prompt
    const userPrompt = buildExplanationUserPrompt(redactedText);

    // 6. Call Provider (OpenAI or injected mock provider for tests)
    let rawOutput = '';
    try {
      if (customProvider) {
        rawOutput = await customProvider(EXPLAIN_SYSTEM_PROMPT, userPrompt);
      } else {
        rawOutput = await this.callOpenAi(EXPLAIN_SYSTEM_PROMPT, userPrompt);
      }
    } catch (err: any) {
      // Missing key or provider failure returns controlled 503 AI_UNAVAILABLE (Master Rule 5)
      throw err;
    }

    // 7. Validate response with Zod schema
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate explanation: provider returned invalid JSON',
        disclaimer: this.defaultDisclaimer,
      };
    }

    const validationResult = aiExplanationSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate explanation: output failed required safety schema validation',
        disclaimer: this.defaultDisclaimer,
      };
    }

    // 8. Audit AI_ANALYSIS with recordId and model name only (NEVER full prompt or output text; Rule 9)
    await AuditService.record({
      actorId: actor.userId,
      role: actor.role,
      action: 'AI_ANALYSIS',
      targetId: recordId,
      requestId,
      metadata: {
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
      },
    });

    return {
      status: 'SUCCESS',
      explanation: validationResult.data,
      disclaimer: validationResult.data.disclaimer,
    };
  }

  public static async compareRecords(
    recordIdA: string,
    recordIdB: string,
    actor: PolicyActor,
    requestId: string = 'internal',
    customProvider?: LlmProviderFn
  ): Promise<any> {
    const [recA, recB] = await Promise.all([
      MedicalRecord.findOne({ _id: recordIdA, deletedAt: null }),
      MedicalRecord.findOne({ _id: recordIdB, deletedAt: null }),
    ]);

    if (!recA || !recB) {
      throw new AppError('One or both records not found for comparison', 404);
    }

    const [canA, canB] = await Promise.all([
      can(actor, 'record:read', { recordPatientId: recA.patientId.toString() }),
      can(actor, 'record:read', { recordPatientId: recB.patientId.toString() }),
    ]);

    if (!canA || !canB) {
      throw new AppError('Unauthorized: Access denied to compare records', 403);
    }

    const aadA = `${recA._id.toString()}|${recA.patientId.toString()}`;
    const aadB = `${recB._id.toString()}|${recB.patientId.toString()}`;
    const textA = redactDirectIdentifiers(decrypt(recA.encryptedPayload, aadA).toString('utf-8'));
    const textB = redactDirectIdentifiers(decrypt(recB.encryptedPayload, aadB).toString('utf-8'));

    const userPrompt = buildComparisonUserPrompt(textA, textB);

    let rawOutput = '';
    if (customProvider) {
      rawOutput = await customProvider(COMPARE_SYSTEM_PROMPT, userPrompt);
    } else {
      rawOutput = await this.callOpenAi(COMPARE_SYSTEM_PROMPT, userPrompt);
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate comparison: invalid JSON',
        disclaimer: this.defaultDisclaimer,
      };
    }

    const validationResult = aiComparisonSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate comparison: schema validation failed',
        disclaimer: this.defaultDisclaimer,
      };
    }

    await AuditService.record({
      actorId: actor.userId,
      role: actor.role,
      action: 'AI_RECORD_COMPARISON',
      targetId: `${recordIdA},${recordIdB}`,
      requestId,
      metadata: { model: env.OPENAI_MODEL || 'gpt-4o-mini' },
    });

    return {
      status: 'SUCCESS',
      comparison: validationResult.data,
      disclaimer: validationResult.data.disclaimer,
    };
  }

  public static async explainTimeline(
    targetPatientId: string,
    actor: PolicyActor,
    requestId: string = 'internal',
    customProvider?: LlmProviderFn
  ): Promise<any> {
    const allowed = await can(actor, 'record:read', { recordPatientId: targetPatientId });
    if (!allowed) {
      throw new AppError('Unauthorized: Access denied to patient timeline', 403);
    }

    const records = await MedicalRecord.find({ patientId: targetPatientId, deletedAt: null })
      .sort({ createdAt: 1 })
      .limit(10);

    if (records.length === 0) {
      return {
        status: 'SUCCESS',
        timeline: {
          chronology: [],
          summary: 'No records available to summarize',
          disclaimer: this.defaultDisclaimer,
        },
      };
    }

    const texts: string[] = [];
    for (const rec of records) {
      const aad = `${rec._id.toString()}|${rec.patientId.toString()}`;
      const dec = decrypt(rec.encryptedPayload, aad).toString('utf-8');
      const red = redactDirectIdentifiers(dec);
      texts.push(`Date: ${rec.createdAt?.toISOString().split('T')[0]} | Title: ${rec.title}\n${red}`);
    }

    const userPrompt = buildTimelineUserPrompt(texts.join('\n---\n'));

    let rawOutput = '';
    if (customProvider) {
      rawOutput = await customProvider(TIMELINE_SYSTEM_PROMPT, userPrompt);
    } else {
      rawOutput = await this.callOpenAi(TIMELINE_SYSTEM_PROMPT, userPrompt);
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate timeline: invalid JSON',
        disclaimer: this.defaultDisclaimer,
      };
    }

    const validationResult = aiTimelineSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate timeline: schema validation failed',
        disclaimer: this.defaultDisclaimer,
      };
    }

    await AuditService.record({
      actorId: actor.userId,
      role: actor.role,
      action: 'AI_TIMELINE_ANALYSIS',
      targetId: targetPatientId,
      requestId,
      metadata: { model: env.OPENAI_MODEL || 'gpt-4o-mini' },
    });

    return {
      status: 'SUCCESS',
      timeline: validationResult.data,
      disclaimer: validationResult.data.disclaimer,
    };
  }

  public static async translateRecord(
    recordId: string,
    targetLanguage: string,
    actor: PolicyActor,
    requestId: string = 'unknown',
    customProvider?: LlmProviderFn
  ): Promise<any> {
    const record = await MedicalRecord.findOne({ _id: recordId, deletedAt: null });
    if (!record) {
      throw new AppError('Medical record not found', 404);
    }

    const allowed = await can(actor, 'record:read', {
      recordPatientId: record.patientId.toString(),
    });
    if (!allowed) {
      throw new AppError('Unauthorized: Access denied to record for translation', 403);
    }

    const aad = `${record._id.toString()}|${record.patientId.toString()}`;
    let documentText = '';
    try {
      const decryptedBytes = decrypt(record.encryptedPayload, aad);
      documentText = decryptedBytes.toString('utf-8');
    } catch {
      throw new AppError('Decryption failed while preparing record for translation', 500);
    }

    const redactedText = redactDirectIdentifiers(documentText);
    const userPrompt = buildTranslationUserPrompt(redactedText, targetLanguage);

    let rawOutput = '';
    try {
      if (customProvider) {
        rawOutput = await customProvider(TRANSLATE_SYSTEM_PROMPT, userPrompt);
      } else {
        rawOutput = await this.callOpenAi(TRANSLATE_SYSTEM_PROMPT, userPrompt);
      }
    } catch (err: any) {
      if (err.statusCode === 503 || err.status === 503 || err.code === 'AI_UNAVAILABLE') {
        return {
          status: 'AI_UNAVAILABLE',
          message: 'AI service unavailable: OPENAI_API_KEY is not configured',
          disclaimer: this.defaultDisclaimer,
        };
      }
      throw err;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate translation: invalid JSON output from model',
        disclaimer: this.defaultDisclaimer,
      };
    }

    const validationResult = aiTranslationSchema.safeParse(parsed);
    if (!validationResult.success) {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not generate translation: schema validation failed',
        disclaimer: this.defaultDisclaimer,
      };
    }

    await AuditService.record({
      actorId: actor.userId,
      role: actor.role,
      action: 'RECORD_READ',
      targetId: record._id.toString(),
      requestId,
      metadata: { action: 'AI_TRANSLATION', targetLanguage },
    });

    return {
      status: 'SUCCESS',
      translation: validationResult.data,
      disclaimer: validationResult.data.disclaimer,
    };
  }

  public static async parseVoiceIntent(
    voiceTranscript: string,
    actor: PolicyActor,
    requestId: string = 'unknown',
    customProvider?: LlmProviderFn
  ): Promise<any> {
    const userPrompt = buildVoiceUserPrompt(voiceTranscript);

    let rawOutput = '';
    try {
      if (customProvider) {
        rawOutput = await customProvider(VOICE_SYSTEM_PROMPT, userPrompt);
      } else {
        rawOutput = await this.callOpenAi(VOICE_SYSTEM_PROMPT, userPrompt);
      }
    } catch (err: any) {
      if (err.statusCode === 503 || err.status === 503 || err.code === 'AI_UNAVAILABLE') {
        const lower = voiceTranscript.toLowerCase();
        let intent: 'SCHEDULE_APPOINTMENT' | 'LOG_VITAL' | 'SEARCH_RECORDS' | 'VIEW_MEDICATIONS' | 'CHECK_INTERACTIONS' | 'UNKNOWN' = 'UNKNOWN';
        let requiresConfirmation = false;
        let previewData: any = {};
        let summary = 'Voice command processed.';

        if (lower.includes('appoint') || lower.includes('doctor') || lower.includes('consult')) {
          intent = 'SCHEDULE_APPOINTMENT';
          requiresConfirmation = true;
          previewData = { reason: voiceTranscript };
          summary = 'Schedule appointment consultation';
        } else if (lower.includes('blood pressure') || lower.includes('heart rate') || lower.includes('glucose') || lower.includes('weight')) {
          intent = 'LOG_VITAL';
          requiresConfirmation = true;
          previewData = { transcript: voiceTranscript };
          summary = 'Record health vital';
        } else if (lower.includes('medication') || lower.includes('prescription')) {
          intent = 'VIEW_MEDICATIONS';
          requiresConfirmation = false;
          summary = 'View active medications';
        } else if (lower.includes('record') || lower.includes('lab') || lower.includes('report')) {
          intent = 'SEARCH_RECORDS';
          requiresConfirmation = false;
          summary = 'Search medical records';
        }

        return {
          status: 'SUCCESS',
          intent: {
            intent,
            naturalLanguageSummary: summary,
            requiresConfirmation,
            previewData,
            disclaimer: 'Voice assistant preview. Actions modifying data require explicit confirmation.',
          },
        };
      }
      throw err;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not parse voice intent: invalid JSON output from model',
        disclaimer: this.defaultDisclaimer,
      };
    }

    const validationResult = aiVoiceIntentSchema.safeParse(parsed);
    if (!validationResult.success) {
      return {
        status: 'COULD_NOT_GENERATE',
        message: 'Could not parse voice intent: schema validation failed',
        disclaimer: this.defaultDisclaimer,
      };
    }

    return {
      status: 'SUCCESS',
      intent: validationResult.data,
      disclaimer: validationResult.data.disclaimer,
    };
  }
}
