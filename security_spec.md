# Security Specification - Distribuciones Que Pollo del Sur

## 1. Data Invariants
- An `InventoryAdjustment` must reference a valid `productId`.
- `Sale` and `Purchase` documents must have a non-negative `total`.
- `CashMovement` cannot have a negative `amount`.
- A `Sale` cannot be created without at least one item.
- `paidAmount` in `Sale` or `Purchase` must be less than or equal to `total`.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to create a Sale with `sellerName` as "Admin" from a non-admin account.
2. **State Shortcutting**: Attempt to update a Sale's `total` after it has been fully paid.
3. **Resource Poisoning**: Create an `InventoryAdjustment` with a 2MB `reason` string.
4. **Identity Integrity**: Update a `Purchase` to change the `supplierId` to a different one.
5. **PII Leak**: A non-admin user attempting to list all `Employee` emails and passwords.
6. **Negative Movement**: Create a `CashMovement` with `amount: -1000`.
7. **Orphaned Write**: Create a `Sale` referencing a non-existent `customerId`.
8. **Shadow Field**: Update a `Product` with `stock: 100` AND `isSecretAdmin: true`.
9. **Illegal ID**: Attempt to create a document with ID `../../etc/passwd`.
10. **Timestamp Fraud**: Create an `Attendance` log with a `date` in the year 2029.
11. **Admin Escalation**: A normal user attempting to update their own `role` to 'admin' in the `employees` collection.
12. **Unauthorized Deletion**: A non-admin attempting to delete a `Purchase` record.

## 3. Test Runner Concept
The tests will ensure that:
- `allow read, write: if false;` is the default.
- Every write is preceded by `isValid[Entity]()`.
- `affectedKeys().hasOnly()` is used on all updates.
- Document IDs are validated with `isValidId()`.
