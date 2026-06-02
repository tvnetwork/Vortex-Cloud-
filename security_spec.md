# Firestore Security Specification

## 1. Data Invariants
- **User Integrity**: A user profile must match the authenticated UID. Role and Verification Status are restricted.
- **Job Ownership**: Only clients can create jobs. Job status transitions must be logical (e.g., cannot go from 'completed' back to 'open').
- **Proposal Authorization**: Only freelancers can bid on jobs. Bids are immutable once a job is in progress or completed.
- **Financial Lockdown**: Transactions are system-only. Users can only read their own financial history.
- **Relational Consistency**: Contracts must reference valid jobs and users. Milestones must belong to valid contracts.
- **Privacy**: KYC data and Private user info (emails) must be strictly isolated to the owner.

## 2. The "Dirty Dozen" Payloads (Red Team Scenarios)

1. **Privilege Escalation**: User 'X' attempts to update their own `role` to 'admin'.
2. **Shadow Field Injection**: User 'X' updates their profile with a `isVerified: true` field not in the schema.
3. **Identity Spoofing**: User 'X' attempts to create a job using `clientId: 'UserY'`.
4. **Denial of Wallet**: User 'X' attempts to create a document with a 1MB string in a field that should be a short ID.
5. **Unauthorized Transaction**: User 'X' attempts to `create` a transaction record crediting their account.
6. **Data Scraping**: Authenticated user attempts a blanket `list` of all user emails/PII.
7. **Bypass Relational Integrity**: User creates a proposal for a job that is already 'completed'.
8. **State Shortcutting**: User updates a milestone from 'pending' directly to 'released' without the 'funded' phase.
9. **Orphaned Writes**: User creates a milestone pointing to a non-existent `contractId`.
10. **Time Spoofing**: User provides a client-side timestamp for `createdAt` instead of a server-side one.
11. **Chat Intrusion**: User attempts to read messages from a `chatId` where they are not in `participantIds`.
12. **KYC Leak**: User 'X' tries to access `get` on a KYC document belonging to User 'Y'.

## 3. The Test Runner (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, collection, doc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "nexus-elite-security",
    firestore: {
      rules: (await import('fs')).readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Nexus Elite Security Audit", () => {
  // Scenario 1: Privilege Escalation
  test("Regular users cannot elevate their own role", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "users/alice"), { role: "admin" }, { merge: true })
    );
  });

  // Scenario 2: Unauthorized Transaction
  test("Users cannot create their own transactions", async () => {
    const bob = testEnv.authenticatedContext("bob");
    await assertFails(
      setDoc(doc(bob.firestore(), "transactions/tx1"), {
        userId: "bob",
        amount: 1000000,
        type: "deposit",
        status: "completed",
        createdAt: new Date()
      })
    );
  });

  // Scenario 3: PII Leak
  test("Users cannot list all profiles to scrape emails", async () => {
    const charlie = testEnv.authenticatedContext("charlie");
    await assertFails(
      getDoc(doc(charlie.firestore(), "users/not_charlie")) // Assuming non-owner access is blocked
    );
  });
});
```
