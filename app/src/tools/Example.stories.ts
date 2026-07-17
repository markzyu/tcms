import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Example from './Example.vue'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'Example/Button',
  component: Example,
  argTypes: {
  },
  parameters: {
  },
  args: {
  },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>
export const Primary: Story = {
  args: {
  },
}