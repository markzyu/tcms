import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/tools/**/*.mdx', '../src/tools/**/*.stories.@(js|jsx|ts|tsx)'],
  staticDirs: ['../public'],
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {}
  }
}
export default config