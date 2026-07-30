<template>
  <tools-screen>
    <template #title>
      <div class="text-2xl font-bold">JSON Objects Editor</div>
    </template>
    <div class="flex flex-col px-4 md:max-w-[600px] md:mx-auto">
      <div class="hidden py-10" data-testid="debug-json-data">Debug: {{ jsonData }}</div>
      <div v-for="fieldGroup in fieldGroupDescriptors" :key="fieldGroup.name">
        <div>
          <div class="mx-5">{{ fieldGroup.name }}</div>
        </div>
        <ion-list class="rounded-md border-0 border-gray-500 p-2 jsonFieldsList">
          <div v-for="field in fieldGroup.fields" :key="field.name">
            <ion-item>
              <ion-textarea
                :auto-grow="true"
                v-if="field.type === 'textarea'"
                :label="field.name"
                :value="get(jsonData, field.fullPath)"
                @input="updateField(field.fullPath, $event)" />
              <div v-else-if="field.type === 'media'" class="flex flex-row w-full">
                <ion-label>{{ field.name }}</ion-label>
                <div class="mx-[25px] my-[10px] w-[100px] h-[100px] bg-gray-100 dark:bg-black flex items-center justify-center">
                  <ion-icon aria-label="Upload image" :icon="camera" size="large" />
                </div>
              </div>
              <ion-input
                v-else-if="field.type === 'input' && field.inputType"
                :placeholder="hintsByInputType[field.inputType]"
                :label="field.name"
                :type="field.inputType"
                :value="get(jsonData, field.fullPath)"
                @input="updateField(field.fullPath, $event)" />
              <ion-input
                v-else
                :label="field.name"
                type="text"
                :value="get(jsonData, field.fullPath)"
                @input="updateField(field.fullPath, $event)" />
            </ion-item>
          </div>
        </ion-list>
      </div>
    </div>
  </tools-screen>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ToolProps } from './toolTypes';
import { get, set } from 'lodash';
import { IonIcon, IonInput, IonItem, IonList, IonTextarea } from '@ionic/vue';
import type { JSONSchema7Definition } from 'json-schema';
import { camera } from 'ionicons/icons';
import { useAppLanguageLocale } from '../utils/i18n';
import { useToolsContent } from './content';
import { toolContentKeys } from './contentKeys';
import { EditorUiFieldTypes } from '@tcms/mini-app-common';
import ToolsScreen from './ToolsScreen.vue';

const [miscGroupName, emailHint, urlHint, passwordHint, telHint, numberHint] = useToolsContent(toolContentKeys);
const hintsByInputType = computed(() => ({
  email: emailHint.value,
  url: urlHint.value,
  password: passwordHint.value,
  tel: telHint.value,
  number: numberHint.value,
} as Partial<Record<string, string>>));

const locale = useAppLanguageLocale();
const props = defineProps<ToolProps<"jsonWithSchema">>();
const jsonData = ref<any>(props.input.json);

// Unlike the EditorUiSchemaJson, the FieldGroups here reflect real data from input
// (Any non singleton field group will have different names, etc)
type FieldGroupDescriptor = {
  // This is also the key of the field group in the UI. It must include all `indices`.
  name: string;
  fields: FieldDescriptor[];
  // This is a list of all indices accessed along the `EditorUiFieldGroup.paths` of the input JSON.
  indices: number[];
};

// Unlike the EditorUiFieldGroup, the FieldDescriptors here reflect real data. Non existing fields are not included.
type FieldDescriptor = {
  // This is also the UI key within the current field group.
  // For now this is just the field name. (TODO: For INTL we need a separate editorUiSchema field for field names in each language)
  name: string;
  // This is the full path to the field in the input JSON
  fullPath: string;
  isSingleton: boolean;
} & EditorUiFieldTypes;

const walkJsonSchemaForAllFields = (schema: JSONSchema7Definition, results?: FieldDescriptor[], rootPath?: string, notSingleton?: boolean): FieldDescriptor[] => {
  const newResults = results ?? [];
  if (typeof schema === "boolean") {
    return newResults;
  } else if (schema.oneOf) {
    // We don't handle union types, for now
    return newResults;
  } else if (schema.type === "object") {
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      walkJsonSchemaForAllFields(value, newResults, rootPath ? `${rootPath}.${key}` : key, notSingleton);
    }
  } else if (schema.type === "array") {
    if (Array.isArray(schema.items)) {
      // We don't handle tuple types, for now
      return newResults;
    }
    walkJsonSchemaForAllFields(schema.items ?? {}, newResults, rootPath ? `${rootPath}.[]` : "[]", true);
  } else if (schema.type !== "null") {
    newResults.push({
      name: rootPath ?? "",
      fullPath: rootPath ?? "",
      isSingleton: !notSingleton,
    });
  }
  return newResults;
}

const newGroup = (name: string): FieldGroupDescriptor => ({
  name,
  fields: [],
  indices: [],
});

const fieldGroupDescriptors = computed<FieldGroupDescriptor[]>(() => {
  const knownPaths = new Set<string>();
  const groupsByName: Record<string, FieldGroupDescriptor> = {};
  const { fieldLabels } = props.input.editorUiSchema;
  const results = props.input.editorUiSchema.fieldGroups.map((fieldGroup) => {
    const { labelByLanguage, fields: rawFields } = fieldGroup;
    const fields: FieldDescriptor[] = rawFields
      .map(({ path, ...field }) => ({
        ...field,
        name: fieldLabels[locale.value]?.[path] ?? path,
        fullPath: (knownPaths.add(path), path),
        isSingleton: !!fieldGroup.isSingleton
      }));
    if (!labelByLanguage) {
      groupsByName[miscGroupName.value] ||= newGroup(miscGroupName.value);
      groupsByName[miscGroupName.value].fields.push(...fields);
      return groupsByName[miscGroupName.value];
    } else {
      const groupName = labelByLanguage[locale.value];
      const group = groupsByName[groupName] ||= newGroup(groupName);
      group.fields.push(...fields);
      return group;
    }
  });
  const allFields = walkJsonSchemaForAllFields(props.input.jsonSchema);
  allFields.forEach((field) => {
    if (knownPaths.has(field.fullPath) || !field.isSingleton) {
      return;
    }
    field.name = fieldLabels[locale.value]?.[field.fullPath] ?? field.fullPath;
    knownPaths.add(field.fullPath);
    groupsByName[miscGroupName.value] ||= newGroup(miscGroupName.value);
    groupsByName[miscGroupName.value].fields.push(field);
  });
  return results;
});

const updateField = (fullPath: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  set(jsonData.value, fullPath, value);
};

</script>

<style scoped>

.jsonFieldsList {
  --ion-item-background: #D9D9D9;
}

@media (prefers-color-scheme: dark) {
  .jsonFieldsList {
    --ion-item-background: #2D2D2D;
  }
}
</style>