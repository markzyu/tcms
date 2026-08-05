import { describe, expect, it } from "vitest";
import type { JSONSchema7Definition } from "json-schema";

import {
  getRequiredFields,
  getShallowArrayPath,
  getShallowArrayPaths,
  newFieldGroup,
  walkJsonSchemaForAllFields,
  type FieldGroupDescriptor,
} from "./json.utils";

describe("getRequiredFields", () => {
  it("returns root-level required fields for a flat object", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
      required: ["name", "email"],
    };

    expect(getRequiredFields(schema).sort()).toEqual(["email", "name"]);
  });

  it("returns dotted paths for nested object properties", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: {
            field1: { type: "string" },
          },
          required: ["field1"],
        },
      },
    };

    expect(getRequiredFields(schema)).toEqual(["profile.field1"]);
  });

  it("uses {index} placeholders for array item schemas", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
    };

    expect(getRequiredFields(schema)).toEqual(["projects.{index}.title"]);
  });

  it("uses numeric indices for tuple array item schemas", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: [
            {
              type: "object",
              properties: {
                a: { type: "string" },
              },
              required: ["a"],
            },
            {
              type: "object",
              properties: {
                b: { type: "string" },
              },
              required: ["b"],
            },
          ],
        },
      },
    };

    expect(getRequiredFields(schema).sort()).toEqual(["items.0.a", "items.1.b"]);
  });

  it("recurses into oneOf branches with the same root path", () => {
    const schema: JSONSchema7Definition = {
      oneOf: [
        {
          type: "object",
          required: ["a"],
        },
        {
          type: "object",
          required: ["b"],
        },
      ],
    };

    expect(getRequiredFields(schema).sort()).toEqual(["a", "b"]);
  });

  it("returns an empty list for boolean schemas", () => {
    expect(getRequiredFields(true)).toEqual([]);
    expect(getRequiredFields(false)).toEqual([]);
  });
});

describe("walkJsonSchemaForAllFields", () => {
  it("collects flat string fields as singleton descriptors", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    expect(walkJsonSchemaForAllFields(schema, [])).toEqual([
      expect.objectContaining({
        fullPath: "name",
        isSingleton: true,
        isRequired: false,
      }),
    ]);
  });

  it("maps boolean fields to toggle descriptors", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
      },
    };

    expect(walkJsonSchemaForAllFields(schema, [])).toEqual([
      expect.objectContaining({
        fullPath: "enabled",
        type: "toggle",
      }),
    ]);
  });

  it("maps string enum fields to segment descriptors", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        alignment: {
          type: "string",
          enum: ["left", "right"],
          default: "left",
        },
      },
    };

    expect(walkJsonSchemaForAllFields(schema, [])).toEqual([
      expect.objectContaining({
        fullPath: "alignment",
        type: "segment",
        choices: ["left", "right"],
        defaultValue: "left",
      }),
    ]);
  });

  it("walks nested object properties", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: {
            bio: { type: "string" },
          },
        },
      },
    };

    expect(walkJsonSchemaForAllFields(schema, []).map((field) => field.fullPath)).toEqual([
      "profile.bio",
    ]);
  });

  it("walks array item fields with {index} paths", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
          },
        },
      },
    };

    expect(walkJsonSchemaForAllFields(schema, [])).toEqual([
      expect.objectContaining({
        fullPath: "projects.{index}.title",
        isSingleton: false,
        arrayPath: "projects",
      }),
    ]);
  });

  it("marks fields as required based on the required list", () => {
    const schema: JSONSchema7Definition = {
      type: "object",
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
      },
    };

    const fields = walkJsonSchemaForAllFields(schema, ["name"]);
    expect(fields.find((field) => field.fullPath === "name")?.isRequired).toBe(true);
    expect(fields.find((field) => field.fullPath === "bio")?.isRequired).toBe(false);
  });

  it("skips boolean schemas, oneOf, tuple arrays, and nested arrays", () => {
    const booleanSchema: JSONSchema7Definition = true;
    const oneOfSchema: JSONSchema7Definition = {
      oneOf: [{ type: "string" }],
    };
    const tupleSchema: JSONSchema7Definition = {
      type: "array",
      items: [{ type: "string" }, { type: "number" }],
    };
    const nestedArraySchema: JSONSchema7Definition = {
      type: "array",
      items: {
        type: "array",
        items: { type: "string" },
      },
    };

    expect(walkJsonSchemaForAllFields(booleanSchema, [])).toEqual([]);
    expect(walkJsonSchemaForAllFields(oneOfSchema, [])).toEqual([]);
    expect(walkJsonSchemaForAllFields(tupleSchema, [])).toEqual([]);
    expect(walkJsonSchemaForAllFields(nestedArraySchema, [], [], "{index}")).toEqual([]);
  });
});

describe("newFieldGroup", () => {
  it("creates singleton groups without an index in the name", () => {
    expect(newFieldGroup("Basic Information", "en")).toEqual({
      name: "Basic Information",
      nameTemplate: "Basic Information",
      fields: [],
      isSingleton: true,
    });
  });

  it("creates array item groups with a 1-based index in the name", () => {
    expect(newFieldGroup("Project {index}", "en", 1)).toEqual({
      name: "Project 2",
      nameTemplate: "Project {index}",
      fields: [],
      isSingleton: false,
    });
  });
});

describe("getShallowArrayPath", () => {
  it("returns the array prefix before {index}", () => {
    expect(getShallowArrayPath("projects.{index}.title")).toBe("projects");
  });

  it("returns undefined when the path has no {index}", () => {
    expect(getShallowArrayPath("name")).toBeUndefined();
  });
});

describe("getShallowArrayPaths", () => {
  it("returns array paths for array item fields in a group", () => {
    const group: FieldGroupDescriptor = {
      name: "Project 1",
      nameTemplate: "Project {index}",
      isSingleton: false,
      fields: [
        {
          name: "Title",
          fullPath: "projects.{index}.title",
          fullPathArrFilter: "projects.{index}.title",
          jsonSchema: { type: "string" },
          isRequired: false,
          isSingleton: false,
        },
        {
          name: "Description",
          fullPath: "projects.{index}.description",
          fullPathArrFilter: "projects.{index}.description",
          jsonSchema: { type: "string" },
          isRequired: false,
          isSingleton: false,
        },
      ],
    };

    expect(getShallowArrayPaths(group)).toEqual(["projects", "projects"]);
  });
});
