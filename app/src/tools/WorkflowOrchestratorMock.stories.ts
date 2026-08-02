import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { MockOrchestratorWrapper } from './WorkflowOrchestrator.mocks'

const meta = {
  title: 'Tools/WorkflowOrchestratorWithMockedTools',
  component: MockOrchestratorWrapper,
  argTypes: {
    workflowToolIds: {
      control: {
        type: 'text',
      },
      description: 'The comma separated list of tool IDs to load in the workflow',
    },
    inputType: {
      control: {
        type: 'select',
      },
      description: 'The type of the input to the workflow',
      options: ['jsonWithSchema', 'miniAppInstance'],
    },
    inputJson: {
      control: {
        type: 'object',
      },
      description: 'The JSON value to pass as input, if inputType is jsonWithSchema',
    },
    inputJsonSchema: {
      control: {
        type: 'object',
      },
      description: 'The JSON schema to validate inputJson with',
    },
  },
  parameters: {
  },
  args: {
    workflowToolIds: 'json-objects-editor,json-arrays-editor',
    inputType: 'jsonWithSchema',
    inputJson: {
      name: 'John Doe',
    },
    inputJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },  
    },
  },
} satisfies Meta<typeof MockOrchestratorWrapper>

export default meta
type Story = StoryObj<typeof meta>
export const BasicTemplateEditor: Story = {
}

export const CrashDuringLoad: Story = {
  args: {
    workflowToolIds: 'mock-crash-during-load',
  },
}

export const LoadingForever: Story = {
  args: {
    workflowToolIds: 'mock-loading-forever',
  },
}

export const ErrorDuringToolRerender: Story = {
  args: {
    workflowToolIds: 'mock-error-during-tool-rerender',
  },
}