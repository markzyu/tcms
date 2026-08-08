import type { Meta, StoryObj } from '@storybook/vue3-vite'
import schema from './JsonObjectsEditor.schema1.json'
import nestedSchema from './JsonArraysEditor.schema1.json'
import JsonArraysEditor from './JsonArraysEditor.vue';

const getExampleMediaUrl = () => {
  return "https://picsum.photos/600/400?v=" + Math.random();
}

const onAction = async (action: any) => {
  console.log("onAction", action);
  if (action.type === "chooseMedia") {
    action.onMediaUrl(getExampleMediaUrl());
  }
}

const meta = {
  title: 'Tools/JsonArraysEditor',
  component: JsonArraysEditor,
  argTypes: {
    input: {
      control: {
        type: 'object',
      },
      description: 'The input to the tool',
    },
  },
  parameters: {
  },
  args: {
    input: {
      type: 'jsonWithSchema',
      json: {
        name: 'John Doe',
        projects: [
          { title: 'Art', description: 'Drawings and sketches', url: 'https://example.com/art', tasks: ['Task 1', 'Task 2'] },
          { title: 'Music', description: 'Compositions and recordings', url: 'https://example.com/music', tasks: ['Task 3', 'Task 4'] },
          { title: 'Programming', description: 'Software development', url: 'https://example.com/programming', tasks: ['Task 5', 'Task 6'] },
        ]
      },
      jsonSchema: schema.jsonSchema,
      editorUiSchema: schema.editorUiSchema as any,
      filePath: {
        type: 'miniAppContent',
        instanceId: '123',
        _pathAsUrl: '/content/main.en.json',
      },
    },
    onAction,
  },
} satisfies Meta<typeof JsonArraysEditor>

export default meta
type Story = StoryObj<typeof meta>
export const BasicUsage: Story = {
}

const jsonWithNestedArrays = {
  name: 'John Doe',
  menus: [
    { title: 'Breakfast', description: 'Description 1', menuItems: [
      { title: 'Dish 1', price: 100, imageUrl: 'https://example.com/image1.jpg', discounts: []},
      { title: 'Dish 2', price: 120, imageUrl: 'https://example.com/image3.jpg', discounts: [{ title: 'Discount 1', newPrice: 90 }]},
      { title: 'Dish 3', price: 80, imageUrl: 'https://example.com/image5.jpg', discounts: []},
    ]},
    { title: 'Dinner', description: 'Description 2', menuItems: [
      { title: 'Dish 4', price: 200, imageUrl: 'https://example.com/image7.jpg', discounts: [{ title: 'Discount 2', newPrice: 180 }]},
      { title: 'Dish 5', price: 150, imageUrl: 'https://example.com/image9.jpg', discounts: []},
    ]},
    { title: 'Catering', description: 'Description 3', menuItems: [
      { title: 'Dish 6', price: 300, imageUrl: 'https://example.com/image11.jpg', discounts: [{ title: 'Discount 3', newPrice: 270 }]},
      { title: 'Dish 7', price: 400, imageUrl: 'https://example.com/image13.jpg', discounts: [{ title: 'Discount 4', newPrice: 350 }]},
    ]},
  ],
  reviews: [
    { rating: 5, username: 'John Doe', comment: 'Great menu!' },
    { rating: 4, username: 'Jane Doe', comment: 'Good menu!' },
    { rating: 3, username: 'Jim Doe', comment: 'Average menu!' },
  ],
};

export const WithNestedArrays: Story = {
  args: {
    ...meta.args,
    input: {
      type: 'jsonWithSchema',
      json: jsonWithNestedArrays,
      filePath: {
        type: 'miniAppContent',
        instanceId: '1234',
        _pathAsUrl: '/content/main.en.json',
      },
      jsonSchema: nestedSchema.jsonSchema,
      editorUiSchema: nestedSchema.editorUiSchema as any,
    },
  }
};

export const WithNestedArraysWithoutProperSchema: Story = {
  args: {
    ...meta.args,
    input: {
      type: 'jsonWithSchema',
      json: jsonWithNestedArrays,
      filePath: {
        type: 'miniAppContent',
        instanceId: '1234',
        _pathAsUrl: '/content/main.en.json',
      },
      jsonSchema: nestedSchema.jsonSchema,
      editorUiSchema: {
        ...nestedSchema.editorUiSchema as any,
        displayAsInnerArrays: [],
      },
    },
  },
}

export const WithFlatArrays: Story = {
  args: {
    input: {
      ...meta.args.input,
      editorUiSchema: {
        ...meta.args.input.editorUiSchema,
        keyFieldsOfArrays: [
          "projects.{index}.title",
        ],
      },
    },
  },
}

export const WithPluralLabel: Story = {
  args: {
    input: {
      ...meta.args.input,
      editorUiSchema: {
        ...meta.args.input.editorUiSchema,
        fieldLabels: {
          ...meta.args.input.editorUiSchema.fieldLabels,
          "en": {
            "projects": "Projects",
          }
        },
        keyFieldsOfArrays: [
          "projects.{index}.title",
        ],
      },
    },
  },
}