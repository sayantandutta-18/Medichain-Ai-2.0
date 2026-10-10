module medichain_anchor::medical_records {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::transfer;

    /// Verifiable record anchor holding cryptographic metadata only (Master Rule 7 & 8).
    /// Published on Sui Testnet at: 0x57c69fd3f040fa1a2746ff5ce45ff8644ef728d5737e76a725719f7492006526
    /// Document contents and private health records are strictly forbidden from being stored on-chain.
    public struct MedicalRecordAnchor has key, store {
        id: UID,
        record_id: vector<u8>,
        record_hash: vector<u8>,
        patient: address,
        created_at: u64,
    }

    /// Public entry function creating an immutable cryptographic anchor on Sui Testnet.
    /// Uses global clock object 0x6 for decentralized timestamping.
    public fun create_record_anchor(
        record_id: vector<u8>,
        record_hash: vector<u8>,
        patient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let anchor = MedicalRecordAnchor {
            id: object::new(ctx),
            record_id,
            record_hash,
            patient,
            created_at: clock::timestamp_ms(clock),
        };

        // Transfer anchor object to transaction sender
        transfer::transfer(anchor, tx_context::sender(ctx));
    }

    /// Accessor for anchored record identifier bytes
    public fun record_id(anchor: &MedicalRecordAnchor): vector<u8> {
        anchor.record_id
    }

    /// Accessor for anchored cryptographic hash bytes (SHA-256)
    public fun record_hash(anchor: &MedicalRecordAnchor): vector<u8> {
        anchor.record_hash
    }

    /// Accessor for patient address
    public fun patient(anchor: &MedicalRecordAnchor): address {
        anchor.patient
    }

    /// Accessor for decentralized timestamp
    public fun created_at(anchor: &MedicalRecordAnchor): u64 {
        anchor.created_at
    }
}
