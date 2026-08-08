<script setup lang="ts">
import { computed, ref } from 'vue';
import { ToolProps } from './toolTypes';
import { useAppLanguageLocale } from '../utils/i18n.ts';
import ToolsScreen from './ToolsScreen.vue';
import { get } from 'lodash';
import { getDeepestArrayItemPath, getDeepestArrayItemPathWithIndex, getDeepestArrayPath } from './json.utils.ts';
import { useToolsContent } from './content.ts';
import * as Keys from './contentKeys.ts';
import IntlMessageFormat from 'intl-messageformat';
import { IonItem } from '@ionic/vue';

const locale = useAppLanguageLocale();
const [outerGroupNameTemplate] = useToolsContent([Keys.JsonArrEditorOuterGroupNameTemplate]);
const [clickHereForFullOuterItem] = useToolsContent([Keys.JsonArrEditorClickHereForFullOuterItem]);
const props = defineProps<ToolProps<"jsonWithSchema">>();

type InnerArrayItemDescriptor = {
  path: string;
  name: string;
}

type OuterArrayItemDescriptor = {
  path: string;
  name: string;
  singularName?: string;
  items: InnerArrayItemDescriptor[];
}

const newOuterDescriptor = (path: string, singularName?: string, name?: string): OuterArrayItemDescriptor => {
  return {
    path,
    name: name || path.split(".").pop() || "",
    singularName,
    items: [],
  };
};

type ExpandedPath = {
  path: string;
  // The label for the deepest array containing the item at this path, if any.
  // (Note: This usually comes from the "exampleArray.{index}" key in the fieldLabels object.)
  label?: string;
  // The same label but in plural form, if any.
  // (Note: This usually comes from the "exampleArray" key in the fieldLabels object.)
  labelPlural?: string;

  // If true, the item must be displayed as an inner array, instead of an outer group of arrays.
  displayAsInnerArray?: boolean;
}

// Expand the abstract {index} placeholders in the path into all possible indices.
const iterateAndExpandIndices = (path: string) => {
  const labels = props.input.editorUiSchema.fieldLabels?.[locale.value] || {};
  const parts = path.split(".");
  const obj = {...(props.input.json || {})};
  const stack: [any, string[], string, string][] = [[obj, parts, "", ""]];
  const results: ExpandedPath[] = [];
  while (stack.length > 0) {
    const [current, parts, rootPath, rootPathWithPlaceholders] = stack.pop()!;
    const part = parts.shift();
    if (part === undefined) {
      const deepestArrayPath = getDeepestArrayPath(rootPathWithPlaceholders);
      const deepestArrayItemPath = getDeepestArrayItemPath(rootPathWithPlaceholders);
      const displayAsInnerArray = (
        deepestArrayItemPath ? props.input.editorUiSchema.displayAsInnerArrays?.includes(deepestArrayItemPath) : undefined
      );
      const label = deepestArrayItemPath && labels[deepestArrayItemPath] && String(
        new IntlMessageFormat(labels[deepestArrayItemPath], locale.value).format({index: ""})
      ).trim();
      const labelPlural = deepestArrayPath && labels[deepestArrayPath] && String(
        new IntlMessageFormat(labels[deepestArrayPath], locale.value).format({index: ""})
      );
      results.push({ path: rootPath, label, labelPlural, displayAsInnerArray });
    } else if (part !== "{index}") {
      const value = get(current, part);
      if (value === undefined || value === null) {
        continue;
      }
      const newRootPath = rootPath ? `${rootPath}.${part}` : part;
      const newRootPathWithPlaceholders = rootPathWithPlaceholders ? `${rootPathWithPlaceholders}.${part}` : part;
      stack.push([value, parts, newRootPath, newRootPathWithPlaceholders]);
    } else if (current instanceof Array) {
      current.forEach((item, index) => {
        const newRootPath = rootPath ? `${rootPath}.${index}` : String(index);
        const newRootPathWithPlaceholders = rootPathWithPlaceholders ? `${rootPathWithPlaceholders}.{index}` : "{index}";
        const newParts = [...parts];
        stack.push([item, newParts, newRootPath, newRootPathWithPlaceholders]);
      });
    }
  }
  return results;
};

const expandedSortedKeys = computed<ExpandedPath[]>(() => {
  const unsorted = props.input.editorUiSchema.keyFieldsOfArrays?.flatMap?.((key) => iterateAndExpandIndices(key)) || [];
  return unsorted.sort((a, b) => b.path.length - a.path.length);
});

const getOuterGroupName = ({ path, label }: ExpandedPath) => {
  const valueAtKey = get(props.input.json, path);

  if (!label) {
    return valueAtKey;
  }

  return new IntlMessageFormat(outerGroupNameTemplate.value, locale.value).format({
    valueAtKey,
    arrayLabel: label,
  });
};

const outerArrayItems = computed<OuterArrayItemDescriptor[]>(() => {
  const visitedKeys = new Set<string>();
  const resultsByLabel: Record<string, OuterArrayItemDescriptor> = {};
  expandedSortedKeys.value.forEach((item) => {
    const key = item.path;
    if (visitedKeys.has(key)) {
      return;
    }
    visitedKeys.add(key);
    const innerDescriptor: InnerArrayItemDescriptor = {
      path: key,
      name: get(props.input.json, key) || "",
    };

    const parent = expandedSortedKeys.value.find(({ path }) => {
      if (path === key) {
        return false;
      }
      const deepestArrayItemPath = getDeepestArrayItemPathWithIndex(path);
      if (!deepestArrayItemPath) {
        return false;
      }
      return key.startsWith(deepestArrayItemPath + ".");
    });
    if (parent && !parent.displayAsInnerArray) {
      visitedKeys.add(parent.path);
      const parentName = getOuterGroupName(parent);
      resultsByLabel[parentName] ||= newOuterDescriptor(parent.path, parent.label, parentName);
      resultsByLabel[parentName].items.push(innerDescriptor);
    } else {
      const label = item.labelPlural || item.label;
      if (label) {
        resultsByLabel[label] ||= newOuterDescriptor(item.path, undefined, label);
        resultsByLabel[label].items.push(innerDescriptor);
      }
    }
  });
  const results = Object.values(resultsByLabel);
  
  // Reverse the order again to restore original array index order.
  results.forEach(({ items }) => {
    items.reverse();
  });
  results.reverse();
  return results;
});

const selected = ref<number>(0);
</script>

<template>
  <tools-screen>
    <template #title>
      Title
    </template>
    <div class="flex flex-row h-full">
      <ion-list class="flex-1 h-full overflow-y-auto outer-list">
        <ion-item v-for="item, index in outerArrayItems" :key="item.path" button
          :class="{ selected: selected === index }"
          :detail="false"
          color="light"
          @click="selected = index">
          {{ item.name }}
        </ion-item>
      </ion-list>
      <ion-list class="flex-[2] h-full overflow-y-auto">
        <div v-if="outerArrayItems[selected]">
          <ion-item v-for="item in outerArrayItems[selected].items" :key="item.path" button :detail="false">
            {{ item.name }}
          </ion-item>
          <ion-item v-if="outerArrayItems[selected].singularName" button :detail="false">
            {{ new IntlMessageFormat(clickHereForFullOuterItem, locale).format({ outerArraySingularName: outerArrayItems[selected].singularName?.toLocaleLowerCase() }) }}
          </ion-item>
        </div>
      </ion-list>
    </div>
  </tools-screen>
</template>

<style scoped>
  ion-item {
    --padding-start: 8px;
    --padding-end: 8px;
    --padding-top: 2px;
    --padding-bottom: 2px;
    --inner-padding-start: 0px;
    --inner-padding-end: 0px;
  }

  ion-list.outer-list ion-item {
    --inner-border-width: 0px;
  }

  ion-list.outer-list {
    position: relative;
    max-width: 400px;
    background-color: var(--ion-color-light);
  }

  ion-list.outer-list::before {
    content: "";
    position: absolute;
    top: 20px;
    right: 3px;
    width: 4px;
    height: calc(100% - 20px);
    border-left: 1px solid var(--ion-color-medium);
    border-right: 1px solid var(--ion-color-medium);
  }

  ion-list.outer-list ion-item::part(container) {
    overflow: hidden;
  }

  ion-list.outer-list ion-item.selected::part(native) {
    position: relative;
  }

  ion-list.outer-list ion-item:not(.selected)::part(native)::before {
    content: "";
    position: absolute;
    top: 10%;
    right: 3px;
    width: 2px;
    height: 80%;
    border-left: 1px solid var(--ion-color-medium);
    border-right: 1px solid var(--ion-color-medium);
  }

  ion-list.outer-list ion-item.selected::part(native)::before {
    content: "";
    position: absolute;
    top: 10%;
    right: 3px;
    width: 4px;
    height: 80%;
    background-color: #007dff;
  }
</style>