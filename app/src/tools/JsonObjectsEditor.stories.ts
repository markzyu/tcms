import type { Meta, StoryObj } from '@storybook/vue3-vite'
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
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },  
      },
      editorUiSchema: {
        fieldGroups: [
          {
            name: "Basic Information",
            paths: ["name"],
          }
        ],
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