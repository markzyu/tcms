<template>
  <div>
    <div class="hidden">Debug: {{ jsonData }}</div>
    <div v-for="fieldGroup in fieldGroupDescriptors" :key="fieldGroup.name">
      <div>
        <div>{{ fieldGroup.name }}</div>
      </div>
      <div v-for="field in fieldGroup.fields" :key="field.name">
        <div class="field-name">{{ field.name }}</div>
        <input type="text" :value="get(jsonData, field.fullPath)" @input="updateField(field.fullPath, $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ToolProps } from './toolTypes';
import { get, has, set } from 'lodash';

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
};

const fieldGroupDescriptors = computed<FieldGroupDescriptor[]>(() => {
  return props.input.editorUiSchema.fieldGroups.map((fieldGroup) => {
    const fields: FieldDescriptor[] = fieldGroup.paths
      .filter((path) => has(jsonData.value, path))
      .map((path) => ({
        name: path,
        fullPath: path,
      }));
    return {
      name: fieldGroup.name ?? "Miscellaneous Questions",
      fields,
      indices: [],
    };
  });
});

const updateField = (fullPath: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  set(jsonData.value, fullPath, value);
};

</script>