[[ZooKies]]

# Step 1 – The User Browses the Web 
---
## 👩‍💻 What the User Sees
The user casually browses a set of websites — say:
- `defi-hub.xyz` (a simulated crypto news site)
- `tropicaltravels.org` (a travel blog)
- `gamealpha.gg` (a gaming guide)

There are no cookie banners, no Meta-style popups, no fingerprinting. It feels like ordinary browsing. However, each site presents a few lightweight, embedded ads — either static banners or simple content cards — tagged with interest categories like `"DeFi"`, `"Travel"`, `"Gaming"`, etc.

When the user **clicks an ad**, it expands to show more detail (or redirects), and that action is treated as a **clear, explicit signal of interest**.

This click is now tied to:
- A cryptographic attestation from the publisher
- The user’s wallet identity (via **Privy**)
- Optionally, an age/country check (via **Self**)

---
## 🚀 The First-Time Setup (Wallet + Identity)

When the user interacts with an ad **for the first time**, the `zkAffinityAgent` detects that no wallet is currently initialized.
### ✅ What Happens:
1. **Privy initializes a user wallet behind the scenes**
    - No Metamask or popup
    - Uses an embedded wallet (via delegated signer)
    - Generates a consistent `walletAddress`, persisted via session or secure device keychain
2. **Self SDK prompts the user to verify their identity**
    - Age, country, and OFAC compliance
    - Either using government ID or partner data
    - The proof is generated and stored in the browser as a signed credential
3. The user is asked **once** to sign a statement with their wallet:
    > “I confirm that this wallet owns the interest profile stored on this device.”
    This binds the profile to the wallet via `personal_sign`.
4. This signature and identity credential are stored locally in `IndexedDB` alongside the ad interest data.

### 👁️ UX Summary:
- One lightweight, background wallet creation
- One identity check (optional for gated ads)
- One signature prompt to confirm wallet-to-profile binding

All other browsing is seamless — ads work without any additional friction after setup.

---
## 🧠 Behind the Scenes: Affinity Tracking via Cryptographic Attestations

Each participating website integrates a lightweight JavaScript snippet that:
1. Renders tagged ads (e.g., an ad tagged `"defi"`)
2. Listens for ad clicks
3. Issues a **signed, cryptographic attestation** when clicked

Each attestation is cryptographically bound to:
- The **ad tag** (e.g., `"defi"`)
- A **timestamp**
- A **nonce** (to prevent replay)
- A **publisher signature** (signed with their private key)

Example:
```json
{
  "tag": "defi",
  "timestamp": 1720001234,
  "nonce": "random123",
  "signature": "0xa7f..."
}
```

The user’s wallet address is also included in the local profile file:
```json
{
  "wallet": "0xABC123...",
  "signedProfileClaim": {
    "message": "I confirm this wallet owns my zkAffinity profile. Timestamp: 2025-07-04T13:20Z",
    "signature": "0xDEADBEEF..."
  },
  "attestations": [ /* signed interest tags */ ],
  "selfProof": {
    "age_verified": true,
    "country": "FR",
    "signature": "0xIDENTITY..."
  }
}
```

This establishes a privacy-preserving but **verifiable root of trust**:  
The user's interest profile is cryptographically backed by their wallet and identity, without revealing anything unless required.

---

## 🔐 Why Signed Attestations Matter

In naive models, users could:
- Manually edit `localStorage`
- Inject fake interest scores
- Qualify for targeted ads dishonestly

This is especially problematic when ad matching is linked to:
- **Payouts**
- **Reputation systems**
- **Age-gated content**

By making publishers the only entities that can issue attestations, we:
- Prevent forgery (users lack signing keys)
- Ensure every interest is tied to a real interaction
- Maintain ZK integrity: all proofs are made from **cryptographically valid inputs**

---

## 🛡️ Self Protocol Integration

If an ad campaign requires the user to be over 18 or not from a sanctioned country, the **Self SDK** provides that proof.

For example:
```json
{
  "age_verified": true,
  "country": "US",
  "not_sanctioned": true,
  "signature": "0x..."
}
```

This proof is stored locally and optionally included in the ad proof request, depending on what the campaign demands.

No private data (like name or birthday) is ever revealed — only cryptographically verified, **selective disclosures**.

---

## 🧾 Flow Summary Diagram

```plaintext
User clicks ad ──▶ Publisher signs attestation ──▶ Stored with wallet address
        │                        │
        └─▶ Privy creates wallet ┘
              │
              └─▶ Self SDK verifies age/country
```

All data lives **locally**, controlled by the user.

---

## 🧰 Technical Stack (Step 1 Only)

|Component|Function|
|---|---|
|Privy SDK|Embedded wallet + `personal_sign`|
|Self SDK|Identity proof (age, country, OFAC)|
|IndexedDB|Local encrypted storage for attestations|
|Ed25519 / ECDSA|Publisher signature scheme|
|`zkAffinityAgent`|JS wrapper that manages wallet, signature, and attestation logic|

---

## 🌟 Benefits from Adding Privy + Self

### 🔑 Wallet = Identity Anchor
- Enables persistence across tabs/sessions/devices
- Can receive future rewards, campaign tokens, or off-chain incentives
### 🎂 Self = Gating Logic for Ads
- Enforces compliance (e.g., “only show to users ≥18 and not on OFAC”)
- Verified via cryptographic claim, no KYC data revealed

### 🧾 Signed Message = Profile Link
- Users cannot spoof interest claims
- Backend or smart contract can verify wallet bound to profile

---

## 📉 Drawbacks / Considerations
- 🧾 Requires users to **sign a message once** with Privy wallet
- 🪪 If using Self, a **one-time identity flow** must be completed (may require real ID)
- 🕵️‍♂️ While fully local and private, the added components introduce slight setup complexity

> ✅ All of this happens only once per user, and is minimal compared to traditional Web2 onboarding.

---

## 🛠️ Simulation for Hackathon
For demo purposes, you can:
- Hardcode 2–3 publisher keypairs (stored in your JS bundle)
- Use mock attestations issued on click
- Use a simplified local-only Self identity proof (e.g., “age_verified: true” by fiat)

This ensures full demo flow **without needing backend or external APIs** — and still qualifies for **Privy**, **Self**, and **Zircuit** prize tracks.


## 🛠️ Future Extensions

The current model only supports binary, tag-level interactions. To match the richness of Web2 profiling:
### 🔓 Publishers Sign Interest Vectors
Instead of signing `{ tag: "defi" }`, a publisher could sign a richer payload:

```json
{
  "vector": {
    "defi": 0.8,
    "privacy": 0.6,
    "gaming": 0.1
  },
  "timestamp": 1720001234,
  "site_id": "defi-hub.xyz"
}
```
- Derived via NLP, content embeddings, scroll/click behavior
- Captures more nuance than binary tags
- Allows ZK proofs of things like dot-product threshold scores

### 🛡️ Offload Signal Generation to TEEs or ZKML
- Publishers feed content + behavior data into a TEE (e.g., Oasis ROFL)
- TEE outputs encrypted interest vectors
- Users retrieve and prove things like:
    > "My private profile matches ad segment A without revealing details"

---

## 🤖 Architecture Evolution Overview

|Component|Hackathon MVP|Future (Web2-grade)|
|---|---|---|
|Signal Source|Clicked tag|Content/behavior vectors from publishers|
|Signing Party|JS in mock site|Publisher backend / TEE|
|Profile Format|Local attestation set|Semantic interest vector|
|Proof Type|`count >= threshold`|Vector similarity, dot product, ML threshold|
|Storage|IndexedDB/localStorage|Encrypted storage / sealed enclave state|
|Verification|Off-chain verifier|zkML circuit or TEE verifier|


# Step 2 – Generate a ZK Proof (Client-side)

## 🧠 Situation Recap
By this point, the user’s browser holds:
- A **Privy-linked wallet address** (auto-generated or connected)
- A **signed message** proving the wallet-to-profile link (medium tie)
- A list of **signed attestations** from various ad clicks
- A **Self identity proof**, if required by the ad campaign

These components are stored locally in the browser’s secure storage (e.g., IndexedDB). The attestations reflect **real, signed, per-tag interest events** — like:

```json
{
  "tag": "defi",
  "timestamp": 1720001234,
  "nonce": "abc123",
  "signature": "0xa7f..."
}
```

The **goal** now is to let the user generate a **zero-knowledge proof** that they meet an advertiser-defined targeting rule — without revealing any raw data or identifiers.

---

## 📣 What Triggers the Proof?
When the user visits a new page that integrates the `zkAffinity` ad SDK, it contains a targeting instruction such as:

```ts
{
  tag: "defi",
  threshold: 2,
  requiresSelfProof: true
}
```

This tells the SDK:
> Only show this ad if the user can prove they’ve interacted with at least **2 ads tagged “defi”**, and can prove they’re over 18 and not from a sanctioned country.

---
## 🧾 What the Browser Now Needs to Prove:
1. The user holds **at least 2 valid, publisher-signed attestations** for `"defi"`
2. These attestations are cryptographically valid (signed by trusted publishers)
3. The profile is bound to the user’s **wallet** via signature
4. The user can provide a **Self-proof** that confirms:
    - `age >= 18`
    - `not_sanctioned = true`

All of this must happen **without revealing:**
- Browsing history
- Publisher identities
- User’s wallet address
- Real age, name, or country

---
## 🔐 Step-by-Step Proof Generation Flow

### 🔍 1. Load Required Inputs
```ts
const { wallet, signedProfileClaim, attestations, selfProof } = await zkAffinityAgent.loadLocalProfile();
```
- Pull all `attestations` from local storage
- Check the `walletAddress` and corresponding `signedProfileClaim`
- Retrieve the `Self` credential (if required)

---
### 📥 2. Filter Relevant Attestations

Only keep attestations that match the ad campaign's target tag:
```ts
const matchingAttestations = attestations.filter(a => a.tag === "defi");
```

If fewer than `threshold` valid attestations exist, skip proof generation and show a fallback (e.g., generic ad).

---
### 🧪 3. Verify Publisher Signatures (Off-Chain)

For performance, do this **before** entering the ZK circuit:
```ts
const verifiedAttestations = matchingAttestations.filter(att => {
  return verifySignature(att, trustedPublisherKeys);
});
```

Only valid, publisher-signed attestations are passed to the ZK circuit.
You may hash them at this point:
```ts
const attestationHashes = verifiedAttestations.map(a => hashAttestation(a));
```

> This enables a faster proof via hash comparison rather than full signature checks in the circuit.

---
### 🔧 4. Prepare Circuit Inputs

#### Private Inputs:
- A list of valid attestation hashes
- Corresponding tags
- The user's **wallet signature** (i.e., signed profile claim)
- The `Self` proof object (if required)
#### Public Inputs:
- Target tag: `"defi"`
- Threshold: `2`

Optional:
- Include wallet address (or a hash of it) as a public signal if binding the proof to a wallet is necessary

---
### 🔁 5. Run the Circuit
Using Noir or Circom, the circuit should:

```ts
count = 0;

for attestation in input.attestationList {
  if (attestation.tag == targetTag) {
    count += 1;
  }
}

assert(count >= threshold);

if (requiresSelfProof) {
  assert(self.ageVerified == true);
  assert(self.notSanctioned == true);
}

assert(verifyProfileSignature(wallet, profileSig) == true);
```

The result is a valid ZK proof of:
> “I own at least 2 valid attestations for `defi`, my profile is bound to this wallet, and I’m over 18 / not sanctioned.”

---

### 📦 6. Output
```json
{
  "proof": "<ZK-proof-bytes>",
  "publicInputs": {
    "tag": "defi",
    "threshold": 2
  },
  "meta": {
    "walletProof": true,
    "selfProof": true
  }
}
```

This payload can now be:
- Sent to a verifier API (off-chain)
- Submitted to a smart contract (Zircuit)
- Encrypted and sent to a TEE (Oasis)

---

## ⚙️ Circuit Design Variants

|Mode|Signature Verification|Self Proof Check|Notes|
|---|---|---|---|
|**Fast Mode**|Off-chain only|Off-circuit|Lightest, best for UX|
|**Full ZK Mode**|In-circuit|In-circuit|Slow but zero-trust|
|**Hybrid Mode**|Mixed (off-chain + hash in-circuit)|In-circuit|Best balance for hackathon|

> For the hackathon, use Hybrid Mode: verify signatures off-chain, hash inputs into circuit, check Self inside circuit.

---

## 👤 Optional: Include Wallet Link in Proof
If you want to allow reward distribution or audit logs later, the ZK circuit can optionally include:
- The wallet address (hashed or as-is)
- A proof that the wallet signed the profile claim

This allows campaign reward contracts to:
- Uniquely identify users (even pseudonymously)
- Enforce 1-proof-per-wallet limits
- Prevent sybil attacks when paired with Self

---

## 🧰 Tooling Recommendation
- [Noir](https://noir-lang.org/): readable syntax + frontend integrations
- [SnarkJS + Circom](https://docs.circom.io/): mature tooling + Groth16
- [zk-kit](https://zk-kit.vercel.app/): great for browser-side usage
- [ethers.js](https://docs.ethers.org/): for wallet signing and signature verification

---

## 📊 UI Integration Flow
```ts
await zkAffinityAgent.prove({
  tag: "defi",
  threshold: 2,
  requiresSelfProof: true
});
```

The result is a ready-to-send object:
```json
{
  proof: "...",
  publicInputs: {
    tag: "defi",
    threshold: 2
  }
}
```

---

## ✅ Step 2 Summary

|Component|Role|
|---|---|
|Wallet (Privy)|Identity anchor, signs profile|
|Self SDK|Proves age and jurisdiction|
|Attestations|Signed interest signals from publishers|
|ZK Circuit|Proves the threshold match + optional Self + wallet claim|
|Output|ZK proof of interest with optional identity gating|

---

# Step 3 – Verify the ZK Proof and Serve a Privacy-Preserving Ad

## 🖥️ What the User Sees:
The user visits a new website — say, `defi-news.io`. They’re not prompted to log in. There’s no cookie popup. But within moments, they see a personalized ad — maybe for a DeFi app or token launch — that seems strikingly relevant.

The user never:
- Shared their browsing history
- Connected a wallet manually
- Disclosed any personal info

And yet the ad fits.

---
## 🧠 What Happens Behind the Scenes

The page integrates the `zkAffinityAgent` ad SDK, which runs the following logic:
```ts
await zkAffinityAgent.requestAd({
  tag: "defi",
  threshold: 2,
  requiresSelfProof: true
});
```

This is a **targeting condition**, analogous to:
> “Only show this ad if the user is interested in DeFi (≥ 2 real signals) and is age 18+.”
At this point, the zkAffinityAgent performs several operations to verify the match **privately**.

---
## 🔍 Internal Workflow
### 1. Load Local Data
- Loads signed attestations from browser storage
- Loads wallet link signature from Privy (`signedProfileClaim`)
- Loads identity proof from Self (`selfProof`)

### 2. Generate the ZK Proof

Reuses the logic from **Step 2** to generate:
```json
{
  "proof": "<ZK-proof-bytes>",
  "publicInputs": {
    "tag": "defi",
    "threshold": 2
  },
  "meta": {
    "walletProof": true,
    "selfProof": true
  }
}
```

This cryptographically proves:
- The user has ≥ 2 valid `defi`-tagged attestations from trusted publishers
- The profile is bound to a wallet
- The user meets the Self identity check (e.g., over 18, not sanctioned)

Now this proof must be **verified**, to decide if the ad should be shown.

---
## 🔁 Where Can the Proof Be Verified?

There are **three architectures**, each with tradeoffs.

---
### ✅ Option A: Off-Chain Verification (Recommended for Hackathon)
- Fastest to implement and demo
- No blockchain involvement
- Good UX (no wallet popup, no delays)

#### Flow:
1. Browser sends:
```http
POST /api/verify-proof
```

With payload:
```json
{
  "proof": "...",
  "publicInputs": {
    "tag": "defi",
    "threshold": 2
  },
  "meta": {
    "walletProof": true,
    "selfProof": true
  }
}
```

2. The backend verifier (Node.js or Rust):
    - Loads the appropriate ZK verification key
    - Verifies the proof
    - Returns:

```json
{
  "valid": true,
  "matchedTag": "defi"
}
```

3. The frontend displays the ad for `defi`

#### Tools:
- [SnarkJS verifier](https://docs.circom.io/)
- [Noir verifier contract (optional)](https://noir-lang.org/)
- Node/Rust server with REST endpoint

---
### 🔗 Option B: On-Chain Verification (Zircuit Prize Path)
- Proof is sent to a smart contract on Zircuit (zkRollup)
- Contract runs the ZK verifier (Groth16 or Plonk)
- Emits an on-chain event like:

```solidity
emit ProofVerified(address user, string tag);
```

#### Flow:
1. Browser or relayer submits:
```ts
{
  proof,
  publicInputs
}
```
2. Contract verifies the proof and triggers a result
3. Frontend listens for this and displays the ad

#### Benefits:
- Transparent
- Decentralized
- Can be extended to **reward** users with tokens or NFTs

#### Drawbacks:
- Requires wallet or relayer for tx
- Adds 3–10s delay for confirmation
- Costs gas (though cheap on Zircuit)

##### ❌ **1. Requires wallet or relayer for tx**
 🔧 How to Improve:
- **Use Account Abstraction (EIP-4337 or 7702):**
    - Let users interact without manually signing each transaction.
    - Privy-compatible wallets (embedded) can use _delegated signing_ + AA-style bundlers.
    - Zircuit supports EIP-7702 — great for this.
 🧠 Optional Flow:
- Wallet is auto-created with Privy.
- Proof is submitted via a **sponsored userOp**, not a raw tx.
- You batch it behind the scenes using a bundler/relayer.
✅ **User never sees a tx popup**  
✅ **Gasless (from user's POV)**  
✅ ✅ **Zircuit has a prize for Account Abstraction too**
##### ⏳ **2. Adds 3–10s delay for confirmation**
 🔧 How to Improve:
- **Optimistic UX / Loading State:**
    - Immediately render the ad as if proof passed.
    - Silently submit tx in background.
    - If it fails (revert), you can fallback — but most won’t.
###### UX Inspiration:
Like Farcaster or Lens:
> “Your cast is live — syncing to the network...”
You can display the ad or reward optimistically, then settle proof later.
✅ **No user-facing delay**  
✅ **You can still reference proof onchain later if needed**

##### 💸 **3. Costs Gas (though cheap on Zircuit)**
#### 🔧 How to Improve:
- **Use a sponsor/relayer model:**
    - You (the ad protocol or campaign) sponsor the tx using:
        - A relayer (like Biconomy, Stackup, etc)
        - Or Zircuit-native AA bundler + gas tank
- **Bundle multiple proofs:**
    - If the user qualifies for 3 ads, batch them into a single tx.
    - Or submit all proofs for an ad campaign in one go.
✅ **Minimizes cost per ad**  
✅ **Keeps infra scalable long-term**

---
## ✅ Ad Rendering

Regardless of verification path, once the proof is validated:

```js
zkAffinityAgent.renderAd("defi");
```
- Ad assets are loaded from a static catalog or registry
- You may use:
    - PNG banners (`/ads/defi.png`)
    - Embedded HTML cards
    - Predefined call-to-action buttons

Optional: simulate **different ad creatives** for different tags and thresholds to make the demo more impactful.

---
## ✨ Visual Summary

```plaintext
[User Visits Page] ──▶ [SDK Requests Proof]
     │                          │
     │       ┌──────────────────┘
     ▼       ▼
[Generate ZK Proof] ──▶ [Verify via A/B/C] ──▶ [Render Tag-Matching Ad]
```

---
## 🔐 Add-on: Proof + Wallet Binding (Optional)

If you want to **tie the ZK proof to a wallet**, you can include:
- A hash of the wallet address as a public signal
- A proof that this wallet signed the profile claim
- A `walletSig` string to bind the proof to a specific key

This is useful for:
- Ad credits
- Loyalty tokens
- Anonymous voting on campaigns
- On-chain Sybil resistance (when paired with Self)

---

## 🔄 Optional: Ad Delivery Rewards

If you want to go further:
- Issue an on-chain “ad delivery receipt” to the user
- Let users **opt-in** to earning rewards (e.g., stablecoins, governance tokens)
- Use the wallet address (via Privy) to send incentives
- Use `ProofVerified()` events to trigger reward logic

You now have a privacy-first **attention economy loop** without surveillance.

---

## 📋 Summary Table

|Component|Role|
|---|---|
|zkProof|Cryptographic proof of interest|
|Public Inputs|Tag + threshold (e.g. "defi", 2)|
|Self Proof|Age and sanction compliance|
|Wallet Signature|Verifies profile binding|
|Verifier|Off-chain API, smart contract, or TEE|
|Output|Match = render personalized ad|

---

## 💡 Final Framing

> This architecture proves a user meets ad targeting conditions without cookies, trackers, or identity leakage.
> 
> Proofs are generated entirely client-side. Verification can be done off-chain (for demo), on-chain (for trust), or in a TEE (for confidentiality).
> 
> This makes personalized advertising compatible with zero-knowledge, privacy-first UX — and paves the way for a better web.

---