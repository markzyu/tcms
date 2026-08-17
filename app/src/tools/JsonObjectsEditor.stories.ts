import type { Meta, StoryObj } from '@storybook/vue3-vite'
import schema from './JsonObjectsEditor.schema1.json'
import gameSchema from './JsonObjectsEditor.schema2.json'
import JsonObjectsEditor from './JsonObjectsEditor.vue'

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
  title: 'Tools/JsonObjectsEditor',
  component: JsonObjectsEditor,
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
} satisfies Meta<typeof JsonObjectsEditor>

export default meta
type Story = StoryObj<typeof meta>
export const BasicJson: Story = {
}

export const WithArrayFields: Story = {
  args: {
    input: {
      type: 'jsonWithSchema',
      json: {
        name: 'John Doe',
        projects: [
          { title: 'Art', description: 'Drawings and sketches', url: 'https://example.com/art', tasks: ['Task 1', 'Task 2'] },
          { title: 'Music', description: 'Compositions and recordings', url: 'https://example.com/music', tasks: ['Task 3', 'Task 4'] },
          { title: 'Programming', description: 'Software development', url: 'https://example.com/programming', tasks: ['Task 5', 'Task 6'] },
        ],
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
}

export const FieldsInsideArray: Story = {
  args: {
    input: {
      type: 'jsonWithSchema',
      json: {
        name: 'John Doe',
        projects: [
          { title: 'Art', description: 'Drawings and sketches', url: 'https://example.com/art', tasks: ['Task 1', 'Task 2'] },
          { title: 'Music', description: 'Compositions and recordings', url: 'https://example.com/music', tasks: ['Task 3', 'Task 4'] },
          { title: 'Programming', description: 'Software development', url: 'https://example.com/programming', tasks: ['Task 5', 'Task 6'] },
        ],
      },
      jsonSchema: schema.jsonSchema,
      editorUiSchema: schema.editorUiSchema as any,
      jsonPath: 'projects.1',
      filePath: {
        type: 'miniAppContent',
        instanceId: '123',
        _pathAsUrl: '/content/main.en.json',
      },
    },
    onAction,
  },
}

export const ExampleGameConfig: Story = {
  args: {
    input: {
      type: 'jsonWithSchema',
      json: {
        tiers: [
          { weight: 100, baseDropRate: 2, pGlobalEffect: 0.1 },
          { weight: 10, baseDropRate: 1, pGlobalEffect: 0.05 },
          { weight: 1, baseDropRate: 0.5, pGlobalEffect: 0.01 },
        ],
        rarities: [
          { name: "Common", weight: 100, textStyle: {} },
          { name: "Rare", weight: 10, textStyle: {} },
          { name: "Legendary", weight: 1, textStyle: {} },
        ],
        effects: [
          { type: "movementSpeed", baseValue: 1, maxValue: 10 },
          { type: "itemVisibility", baseValue: 1, maxValue: 10 },
          { type: "screenZoom", baseValue: 1, maxValue: 10 },
        ],
        player: {
          directionChangeInterval: 1,
          directionChangeMaxAngle: 10,
        },
        drops: [
          {
            baseName: "Plastic Bottle",
            baseRarity: 0,
            baseTier: 0,
            baseWeight: 100,
            baseTextStyle: { fontColor: "#000000" },
            baseMedia: [],
            animationOnPickup: "zoomOutAndFade",
            animationOnDrop: "zoomOutAndFade",
            effects: [],
            variants: [
              {
                name: "Glass Bottle",
                rarity: 1,
                weight: 10,
                textStyle: {},
                media: [],
              }
            ]
          }
        ],
        scoreFunction: "A * rarity * B ^ tier",
        scoreFunctionParamA: 100,
        scoreFunctionParamB: 1.05,
      },
      jsonSchema: gameSchema.jsonSchema,
      editorUiSchema: gameSchema.editorUiSchema as any,
      filePath: {
        type: 'miniAppContent',
        instanceId: '123',
        _pathAsUrl: '/content/main.en.json',
      },
    },
    onAction,
  },
}