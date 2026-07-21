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
      editorUiSchema: schema.editorUiSchema,
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