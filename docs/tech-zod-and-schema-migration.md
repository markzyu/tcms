This is a reminder of the exising patterns used for maintaining Zod schemas for backwards compatibility.

The choice is basically between 

* using `preprocess` and `transform` to handle schema migrations.
* using `verzod` to declare all versions directly.

I am leaning towards using `preprocess` and `transform`. Because the verzod library is not mature and would be a new dependency.

----

According to Gemini:

Zod handles version migrations and backwards compatibility primarily by combining `.default()`, `.catch()`, and `.transform()` methods. This allows you to gracefully ingest older data shapes and transform them to match your latest schema. [1, 2, 3, 4]  

1. Adding New Fields (Backward Compatibility) 

When you add a new field to your schema, older data won't have it. You can use `default()` or `catch()` to inject fallback values so validation passes and the application defaults smoothly. [1, 4, 5]  

```ts
const UserSchemaV2 = z.object({
  id: z.string(),
  email: z.string(),
  // New field: default value for older records missing this data
  status: z.enum(["active", "inactive"]).default("active"), 
});
```

2. Renaming Fields 

If you rename an old property (e.g., `userName` to `username`), you can use `preprocess` or `transform` to map the old property to the new name before validation occurs. [2, 4]  

```ts
const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
}).preprocess((val) => {
  if (val && typeof val === 'object' && 'userName' in val) {
    const { userName, ...rest } = val as any;
    // Map the deprecated key to the new key
    return { username: userName, ...rest }; 
  }
  return val;
});
```

3. Multi-Step Schema Evolution 

For more complex data evolution (e.g., merging two fields, restructuring arrays), you can construct a migration pipeline using `or()` or a series of conditional transforms. [2, 4]  

This allows you to check if the payload is in V1 shape, transform it to V2, and then parse it using your V2 schema. [2]  

```ts
const V1Schema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

const V2Schema = z.object({
  fullName: z.string(),
});

// Create a migrating schema that handles either format
const MigratedSchema = V2Schema.or(V1Schema.transform((v1Data) => ({
  fullName: `${v1Data.firstName} ${v1Data.lastName}`,
})));
```

4. Ecosystem & Advanced Solutions 

If you have massive, multi-version JSON objects (like v1 → v2 → v3), you can use third-party community libraries built on Zod, such as `verzod` or generic schema evolution helpers, to define an ordered chain of type-safe migrations. [2, 4, 6]  

---

[1] https://www.reddit.com/r/typescript/comments/17xzfsr/how_do_you_handle_schema_migrations_with/
[2] https://github.com/colinhacks/zod/issues/3604
[3] https://www.jcore.io/articles/schema-versioning-with-zod
[4] https://github.com/Nano-Collective/organisation/discussions/34
[5] https://haweecodes.medium.com/from-default-to-prefault-b59b7e0af144
[6] https://github.com/AndrewBastin/verzod

