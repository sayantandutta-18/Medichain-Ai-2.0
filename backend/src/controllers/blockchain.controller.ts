import { Request, Response, NextFunction } from 'express';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { AccessRequest } from '../models/AccessRequest.js';
import { env } from '../config/env.js';
import { SuiClient } from '../blockchain/suiClient.js';
import { AppError } from '../middleware/errorHandler.js';

export class BlockchainController {
  public static async getExplorer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      let filter: any = { deletedAt: null };

      if (req.user.role === 'PATIENT') {
        filter.patientId = req.user.userId;
      } else if (req.user.role === 'DOCTOR') {
        const approvedConsents = await AccessRequest.find({
          doctorId: req.user.userId,
          status: 'APPROVED',
          expiresAt: { $gt: new Date() },
        });
        const patientIds = approvedConsents.map((c) => c.patientId);
        filter.patientId = { $in: patientIds };
      }
      // ADMIN sees all

      const records = await MedicalRecord.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id title type sha256 blockchainAnchor createdAt');

      const currentMode = SuiClient.getMode();

      const items = records.map((rec) => {
        const anchor = rec.blockchainAnchor;
        const mode = anchor?.mode || currentMode;
        const isTestnet = mode === 'testnet';
        const txDigest = anchor?.txDigest;
        const objectId = anchor?.objectId;

        return {
          recordId: rec._id,
          title: rec.title,
          type: rec.type,
          sha256: rec.sha256,
          status: anchor?.status || 'PENDING',
          mode,
          txDigest: txDigest || null,
          objectId: objectId || null,
          anchoredAt: anchor?.anchoredAt || rec.createdAt,
          explorerUrl: txDigest && isTestnet ? `https://suiscan.xyz/testnet/tx/${txDigest}` : null,
          objectExplorerUrl: objectId && isTestnet ? `https://suiscan.xyz/testnet/object/${objectId}` : null,
        };
      });

      const totalRecords = records.length;
      const confirmedAnchors = items.filter((i) => i.status === 'CONFIRMED').length;
      const pendingAnchors = items.filter((i) => i.status === 'PENDING').length;

      res.status(200).json({
        status: 'SUCCESS',
        network: env.SUI_NETWORK || 'testnet',
        anchorMode: currentMode,
        packageId: env.SUI_PACKAGE_ID || null,
        stats: {
          totalRecords,
          confirmedAnchors,
          pendingAnchors,
        },
        records: items,
      });
    } catch (err) {
      next(err);
    }
  }
}
