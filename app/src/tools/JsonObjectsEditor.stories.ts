import type { Meta, StoryObj } from '@storybook/vue3-vite'
import schema from './JsonObjectsEditor.schema1.json'
import JsonObjectsEditor from './JsonObjectsEditor.vue'

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
      savePath: {
        type: 'miniAppContent',
        instanceId: '123',
        _pathAsUrl: '/content/main.en.json',
      },
    },
    onAction: async (action) => {
      console.log("onAction", action);
    },
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
      savePath: {
        type: 'miniAppContent',
        instanceId: '123',
        _pathAsUrl: '/content/main.en.json',
      },
    },
    onAction: async (action) => {
      console.log("onAction", action);
      if (action.type === "chooseMedia") {
        action.onMediaUrl("https://picsum.photos/600/400?v=" + Math.random());
      }
    },
  },
}