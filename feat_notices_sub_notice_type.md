## Adding `notice_sub_type` to notices table

A migration has been added to include the `notice_sub_type` column in the `notices` table. The `create` API now supports this new field and performs validation.

**Migration:**  
Run the following SQL to update your notices schema:
```sql
ALTER TABLE notices ADD COLUMN notice_sub_type VARCHAR(255) NULL;
```

---

## API Changes

### 1. `/api/create` (POST)

#### Description
Supports creation of notices with an additional, validated `notice_sub_type` field. If the given `notice_type` requires a sub-type, the request must include a valid `notice_sub_type`. Error handling is included for missing or invalid sub-types.

#### Example: Valid Request Payload
```json
{
  "id": "1702472618475",
  "title": "Test with sub type",
  "notice_type": "job",
  "notice_sub_type": "regularteaching",
  "openDate": 1702472618000,
  "closeDate": 1702472618000,
  "department": "AR",
  "attachments": [
    {
      "name": "test.doc",
      "url": "https://docs.cloud.testman.pdf"
    }
  ],
  "isDept": 0,
  "important": 0,
  "isVisible": 1,
  "email": "admin@institute.ac.in"
}
```

#### Example: Successful API Response
```json
{
  "affectedRows": 1,
  "insertId": "1702472618475",
  "warningStatus": 0
}
```

---

#### Example: Invalid Request Payload (Missing Required `notice_sub_type`)
```json
{
  "id": "1702472618476",
  "title": "Test missing sub type",
  "notice_type": "job",
  "openDate": 1702472618000,
  "closeDate": 1702472618000,
  "department": "AR",
  "attachments": [
    {
      "name": "test.doc",
      "url": "https://docs.cloud.testman.pdf"
    }
  ],
  "isDept": 0,
  "important": 0,
  "isVisible": 1,
  "email": "admin@institute.ac.in"
}
```

#### Example: Error API Response
```json
{
  "message": "Invalid or missing notice_sub_type for notice_type: job"
}
```

---

*(Further API changes and examples should be added to this section similarly, grouped by endpoint and method.)*

Just ensure your request payload includes a valid `notice_sub_type` string whenever it is required by the `notice_type` you are submitting.  
The examples above show both success and error responses for reference.