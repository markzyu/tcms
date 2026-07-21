import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Playground from './playground.vue';

const meta = {
  title: 'NPM Libraries Playground',
  component: Playground,
  argTypes: {
    libraryName: {
      control: {
        type: 'select',
        options: ['intl-messageformat', 'zod'],
      },
    },
    libraryInput: {
      control: {
        type: 'object',
      },
    }
  },
  parameters: {
  },
} satisfies Meta<typeof Playground>

export default meta
type Story = StoryObj<typeof meta>

export const IntlMessageFormatEnglish: Story = {
  args: {
    libraryName: 'intl-messageformat',
    libraryInput: {
      message: 'Hello, {name}! Today is {timestamp, date, ::MMMddd}.',
      locale: 'en',
      variables: {
        name: 'John Doe',
        timestamp: new Date(),
      },
    },
  },
}

export const IntlMessageFormatJapanese: Story = {
  args: {
    libraryName: 'intl-messageformat',
    libraryInput: {
      message: 'こんにちは、{name}！今日は{timestamp, date, ::MMMddd}です。',
      locale: 'ja',
      variables: {
        name: '山田太郎',
        timestamp: new Date(),
      },
    },
  },
}

export const ZodCatchesIncompleteRecord: Story = {
  args: {
    libraryName: 'zod',
    libraryInput: {
      schemaName: 'enumRecord',
      json: {
        a: '123',
      },
    },
  },
}

export const ZodParsesCompleteRecord: Story = {
  args: {
    libraryName: 'zod',
    libraryInput: {
      schemaName: 'enumRecord',
      json: {
        a: '1',
        b: '2',
        c: '3',
      },
    },
  },
}