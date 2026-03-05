# Schema Changelog

Track all database schema changes here.

## Format
```
### YYYY-MM-DD: Description
- SQL: `ALTER TABLE ...`
- Affected: users/checkins/etc
- Migration: steps if needed
- Rollback: how to undo
```

---

## Changes

### Pre-Mar 4, 2026: Initial Schema
- Tables: users, sessions, checkins, likes, follows, comments, reactions, feedback
- See `schema.sql` for full structure

### Feb 2026: Added mood column
- SQL: `ALTER TABLE checkins ADD COLUMN mood TEXT;`
- Affected: checkins table
- Migration: None needed (nullable column)
- Rollback: `ALTER TABLE checkins DROP COLUMN mood;`

---

*Add all future schema changes above this line*
