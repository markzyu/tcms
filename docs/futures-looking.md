# TCMS — Future-looking contracts (draft)

**Status:** DRAFT — everything beyond v0.1 Phase 0, is an early draft.

This document lists the desired final shapes of schemas and directory layout when TCMS is fully implemented.

## Directory layout (with CAS)

```
instances/
  {instanceId}/
    instance.json
    history.json          # content + asset history
    cas/
      f5/
        f5d127e8279b096632db28dc23e8b13b893da7129e0b7c8a1e92c8a0c8e8f8b0.jpg
      b9/
        b94d27b9934d3e08a8e1d8227fd2ce510004fd5e1b17e23c52c3c0f0b0e0c0d.json
templates/
  example-info-card1/
    manifest.json
    schema/content.schema.json
    schema/xxx.schema.json  # any other schema referenced by content
    app/                    # mini-app static bundle (React CSR or Vue SSR)
```

### CAS IDs

Each blob is stored under `cas/{first-two-hex-chars}/` using a **SHA-256** content hash (64 hex characters) plus the original file extension.

Examples:

- Asset: `f5d127e8279b096632db28dc23e8b13b893da7129e0b7c8a1e92c8a0c8e8f8b0.jpg`
- JSON: `b94d27b9934d3e08a8e1d8227fd2ce510004fd5e1b17e23c52c3c0f0b0e0c0d.json`

## `instance.json`

This json is the source of truth for the current Ops configs of the mini app instance.

```json
{
  "name": "My contact card",
  "slug": "my-contact-card",
  "templateId": "example-info-card1",
  "templateVersion": "1.0.0",
  "createdAt": 1782051137000,
  "updatedAt": 1782051137000,
  "contentList": {
    "contents": {
      "main.en.json": "b94d27b9934d3e08a8e1d8227fd2ce510004fd5e1b17e23c52c3c0f0b0e0c0d.json",
      "main.es.json": "....",
      "(page short name).(variant).json": "...."
    },
    "assets": [
      "f5d127e8279b096632db28dc23e8b13b893da7129e0b7c8a1e92c8a0c8e8f8b0.jpg"
    ]
  },
  "lcdn": {
    "serverRenderer": "static",
    "overrideMountPath": "/cards/my-contact-card (optional)",
    "currentVariant": "en"
  },
  "rcdn": {
    "enabled": false,
    "publishHtml": true,
    "serverRenderer": "static",
    "overrideMountPath": "/cards/my-contact-card (optional)",
    "currentVariant": "es"
  }
}
```

`contentList` stores the CAS IDs of the contents and assets so Local CDN can decide which files to serve, especially when other blobs on disk are not part of the current version.

* `lcdn.serverRenderer` choices: `callCSR`, `callMiniSSR`, `static`

## `content.<variant>.json`

Where `<variant>` is one of the below:

* `<language-script>`: Example: `en`, `jp`, `zh-hant`
* `<language-script>.<edition>`: Example: `en.chrismas`, `jp.hanabi`.

When CAS is enabled, string fields that reference assets hold the CAS ID (SHA-256 + extension), not a plain filename.

```json
{
  "name": "John Doe",
  "headline": "Photographer",
  "bio": "John is a photographer based in New York City.",
  "richTextList": [
    { "text": "He is known for his street photography and his use of color." },
    { "text": "He has been photographing for 10 years." },
    { "text": "His favorite camera is the Leica M10." }
  ]
  "email": "john@example.com",
  "phone": "123-456-7890",
  "heroImage": "f5d127e8279b096632db28dc23e8b13b893da7129e0b7c8a1e92c8a0c8e8f8b0.jpg",
  "projects": [
    {
      "name": "Project 1",
      "richTextList": [
        { "text": "Project 1 description" }
      ]
    }
  ]
}
```

## `content.schema.json`

Example of how schemas and editor UI may work for multi-page templates with both flat objects, and nested arrays. Intentionally richer than example-info-card1 Phase 0 content.

**Caveats**: Due to how we design the json editors and the `editorUiSchema` field, the `jsonSchema` field cannot be just any arbitrary json schema. For example, you won't be able to use `oneOf` as a property of an object. However, it could be the items type of an array. Please see tech-caveats-and-choices.md for more details.

```json
{
  "schemaVersion": "0.1.0",
  "editorUiSchema": {
    "fieldGroups": [
      {
        "label": {
          "en": "Basic Information",
          "jp": "基本情報"
        },
        "paths": ["name", "headline", "bio"],
        "isSingleton": true
      },
      {
        "label": {
          "en": "Contact Information",
          "jp": "連絡先情報"
        },
        "paths": ["email", "phone"],
        "isSingleton": true
      },
      {
        "isSingleField": true,
        "isSingleton": true,
        "paths": ["heroImage"]
      },
      {
        "label": {
          "en": "Project {index}",
          "jp": "プロジェクト {index}"
        },
        "paths": ["projects.{index}.name"]
      }
    ],
    "arrayGroups": [
      {
        "label": {
          "en": "\"{groupName}\" Project",
          "jp": "「{groupName}」プロジェクト"
        },
        "groupsPath": "projects",
        "groupName": "projects.{groupIndex}.name",
        "itemsPath": "projects.{groupIndex}.richTextList",
        "itemName": "projects.{groupIndex}.richTextList.{itemIndex}.text"
      },
      {
        "isSingleArray": true,
        "label": {
          "en": "Biography Rich Text",
          "jp": "自己紹介 (リッチテキスト)"
        },
        "itemsPath": "richTextList",
        "itemName": "richTextList.{itemIndex}.text"
      }
    ]
  },
  "fieldLabels": {
    "en": {
      "name": "Name",
      "headline": "Headline",
      "bio": "Bio",
      "email": "Email",
      "phone": "Phone",
      "heroImage": "Hero Image"
    },
    "jp": {
      "name": "名前",
      "headline": "見出し",
      "bio": "自己紹介",
      "email": "メールアドレス",
      "phone": "電話番号",
      "heroImage": "写真"
    }
  },
  "jsonSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "projects": {
        "description": "(This is a demo of arrays) This is a list of projects that the person has worked on.",
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "richTextList": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "text": { "type": "string" },
                  "listIcon": { "type": "string" },
                  "isBold": { "type": "boolean" },
                  "isItalic": { "type": "boolean" },
                  "isUnderline": { "type": "boolean" },
                  "isStrikethrough": { "type": "boolean" },
                  "isCode": { "type": "boolean" }
                }
              }
            }
          }
        }
      },
      "headline": {
        "type": "string"
      },
      "bio": {
        "type": "string",
        "isMarkdown": true
      },
      "email": {
        "type": "string"
      },
      "phone": {
        "type": "string"
      },
      "heroImage": {
        "description": "This is a wide image that will be displayed at the top of the contact card.",
        "type": "string"
      },
      "richTextList": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "listIcon": { "type": "string" },
            "isBold": { "type": "boolean" },
            "isItalic": { "type": "boolean" },
            "isUnderline": { "type": "boolean" },
            "isStrikethrough": { "type": "boolean" },
            "isCode": { "type": "boolean" }
          }
        }
      }
    }
  }
}
```

Note: `richTextList` is an example of a rich text schema. In reality it would be reused through schema references, not by directly copying it everywhere:

```json
"richTextList": { "$ref": "common.schema.json#/$defs/richTextList" }
```

## `template.manifest.json`

```json
{
  "id": "example-info-card1",
  "version": "1.0.0",
  "title": "Contact Card",
  "pages": {
    "main": {
      "publicPath": "{instanceMountPath}",
      "apiPath": "/",
      "schema": "schema/content.schema.json"
    },
    "projects-{index}": {
      "publicPath": "{instanceMountPath}/projects/{index}",
      "apiPath": "/projects/{index}",
      "schema": "schema/projects.schema.json"
    },
    "(page short name)": {
      "publicPath": "(the mount path of this specific page)",
      "apiPath": "(the path as rendered by the csrBackend)",
      "schema": "schema/anything.schema.json"
    }
  },
  "defaultServerRenderer": "csr",
  "dependencies": {
    "react": "/react@18.3.1/dist/react.production.min.js",
    "react-dom": "/react-dom@18.3.1/dist/react-dom.production.min.js"
  },
  "csrBackend": {
    "framework": "actix-builtins",
    "cspRules": {
      "default-src": "self {lcdnDomain} {rcdnDomain}",
      "script-src": "self {lcdnDomain} {rcdnDomain}",
      "style-src": "self {lcdnDomain} {rcdnDomain}",
      "img-src": "self {lcdnDomain} {rcdnDomain}",
      "font-src": "self {lcdnDomain} {rcdnDomain}",
      "connect-src": "self {lcdnDomain} {rcdnDomain}",
      "frame-src": "self {lcdnDomain} {rcdnDomain}",
      "media-src": "self {lcdnDomain} {rcdnDomain}"
    },
    "apiPaths": []
  }
}
```

**Dynamic page short names**:

Page short names are defined in the `pages` object. Templates can declare patterns that expand to many instance pages, e.g. `projects-{index}`.

* When page short names contain variables like `{index}`, they are called **Dynamic Page Short Names**.
* Variable names match alphanumeric characters only (not `-`).
* `template.manifest.json` defines the pattern.
* `instance.json` defines each concrete page key (e.g. `projects-0`, `projects-1`, `projects-2`).

**Backend configs**:

* **cspRules:** variable replacement follows `Intl.MessageFormat` syntax.
* **apiPaths:** API paths from sidecar/builtin backends enabled for this template. HTML paths are not listed here.
