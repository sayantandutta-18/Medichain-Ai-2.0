module medichain_anchor::medical_record_anchor {
    use sui::event;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::string::String;

    /// Verifiable record anchor holding cryptographic metadata only (Master Rule 7 & 8).
    /// Document contents and private health records are strictly forbidden from being stored on-chain.
    public struct RecordAnchor has key, store {
        id: UID,
        record_id: String,
        record_hash: vector<u8>,
        patient: address,
        created_at: u64,
    }

    /// Event emitted when an integrity anchor is written to the blockchain.
    public struct RecordAnchoredEvent has copy, drop {
        record_id: String,
        record_hash: vector<u8>,
        patient: address,
        created_at: u64,
        anchor_id: address,
    }

    /// Shared registry tracking anchor records on Sui testnet.
    public struct AnchorRegistry has key {
        id: UID,
        total_anchors: u64,
    }

    /// Initialize the package and create the shared registry.
    fun init(ctx: &mut TxContext) {
        let registry = AnchorRegistry {
            id: object::new(ctx),
            total_anchors: 0,
        };
        transfer::share_object(registry);
    }

    /// Public entry function to anchor record cryptographic hash metadata.
    public entry fun anchor_record(
        registry: &mut AnchorRegistry,
        record_id: String,
        record_hash: vector<u8>,
        patient: address,
        created_at: u64,
        ctx: &mut TxContext
    ) {
        let anchor_uid = object::new(ctx);
        let anchor_addr = object::uid_to_address(&anchor_uid);

        let anchor = RecordAnchor {
            id: anchor_uid,
            record_id,
            record_hash,
            patient,
            created_at,
        };

        registry.total_anchors = registry.total_anchors + 1;

        event::emit(RecordAnchoredEvent {
            record_id,
            record_hash,
            patient,
            created_at,
            anchor_id: anchor_addr,
        });

        transfer::transfer(anchor, tx_context::sender(ctx));
    }
}
