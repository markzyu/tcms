import schema from "./JsonObjectsEditor.schema1.json";

export const defaultSavePath = {
  type: "miniAppContent" as const,
  instanceId: "123",
  _pathAsUrl: "/content/main.en.json",
};

export const withArrayFieldsJson = {
  name: "John Doe",
  projects: [
    {
      title: "Art",
      description: "Drawings and sketches",
      url: "https://example.com/art",
      tasks: ["Task 1", "Task 2"],
    },
    {
      title: "Music",
      description: "Compositions and recordings",
      url: "https://example.com/music",
      tasks: ["Task 3", "Task 4"],
    },
    {
      title: "Programming",
      description: "Software development",
      url: "https://example.com/programming",
      tasks: ["Task 5", "Task 6"],
    },
  ],
};

export const withArrayFieldsProps = {
  input: {
    type: "jsonWithSchema" as const,
    json: withArrayFieldsJson,
    jsonSchema: schema.jsonSchema,
    editorUiSchema: schema.editorUiSchema,
    savePath: defaultSavePath,
  },
};

export const withArrayFieldsInitialDebugJson = {
  name: "John Doe",
  projects: withArrayFieldsJson.projects,
  exampleDeepField: {
    field3: false,
  },
  heroAlignment: "left",
};

export const withArrayFieldsInitialRender = {
  groupNames: [
    "Basic Information",
    "Contact Information",
    "Example Deep Field",
    "Miscellaneous Questions",
    "Project 1",
    "Project 2",
    "Project 3",
  ],
  gridTemplateRows: "repeat(4, 1fr)",
  groups: [
    {
      name: "Basic Information",
      fields: [
        { testId: "field-undefined-name", label: "Name", value: "John Doe" },
        { testId: "field-undefined-headline", label: "Headline", value: undefined },
        { testId: "field-textarea-bio", label: "Bio", value: undefined },
      ],
    },
    {
      name: "Contact Information",
      fields: [
        { testId: "field-input-email", label: "Email", value: undefined },
        { testId: "field-input-phone", label: "Phone", value: undefined },
      ],
    },
    {
      name: "Example Deep Field",
      fields: [
        { testId: "field-input-exampleDeepField.field1", label: "Question 1", value: undefined },
        { testId: "field-undefined-exampleDeepField.field2", label: "Question 2", value: undefined },
        { testId: "field-toggle-exampleDeepField.field3", label: "Question 3", value: false },
      ],
    },
    {
      name: "Miscellaneous Questions",
      fields: [
        { testId: "field-media-heroImage", label: "Hero Image", value: undefined },
        { testId: "field-undefined-heroAltText", label: "Hero Alt Text", value: undefined },
        { testId: "field-segment-heroAlignment", label: "Hero Alignment", value: "left" },
      ],
    },
    {
      name: "Project 1",
      fields: [
        { testId: "field-undefined-projects.0.title", label: "Title", value: "Art" },
        { testId: "field-undefined-projects.0.description", label: "Description", value: "Drawings and sketches" },
        { testId: "field-undefined-projects.0.url", label: "URL", value: "https://example.com/art" },
      ],
    },
    {
      name: "Project 2",
      fields: [
        { testId: "field-undefined-projects.1.title", label: "Title", value: "Music" },
        { testId: "field-undefined-projects.1.description", label: "Description", value: "Compositions and recordings" },
        { testId: "field-undefined-projects.1.url", label: "URL", value: "https://example.com/music" },
      ],
    },
    {
      name: "Project 3",
      fields: [
        { testId: "field-undefined-projects.2.title", label: "Title", value: "Programming" },
        { testId: "field-undefined-projects.2.description", label: "Description", value: "Software development" },
        { testId: "field-undefined-projects.2.url", label: "URL", value: "https://example.com/programming" },
      ],
    },
  ],
};

export const singletonOnlyGroupNames = [
  "Basic Information",
  "Contact Information",
  "Example Deep Field",
  "Miscellaneous Questions",
];

export const allGroupNames = [
  "Basic Information",
  "Contact Information",
  "Example Deep Field",
  "Miscellaneous Questions",
  "Project 1",
  "Project 2",
  "Project 3",
  "Project 4",
  "Project 5",
];
