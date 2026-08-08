# Security Spec for KHAYAL WMS

## Data Invariants
1. Users are assigned roles: `super_admin`, `warehouse_manager`, `employee`, `viewer`.
2. Negative stock is strictly prevented on the client and server.
3. Movements are created for all inventory stock adjustments, withdrawals, and incoming entries.
4. Audit logs are immutable once created.
5. Only Super Admin can create, modify, or delete user accounts and system settings.

## Role Permissions Matrix
- **Super Admin**: Full read/write/delete access to all collections and user management.
- **Warehouse Manager**: Manage inventory, categories, units, suppliers, customers, projects, movements, and view reports. Cannot delete users or change system settings.
- **Employee**: Read inventory, record withdrawals (movements), view own activities and reports. Cannot edit/delete materials or change master configurations.
- **Viewer**: Read-only access to inventory, movements, and reports.
