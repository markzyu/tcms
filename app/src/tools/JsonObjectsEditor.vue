<template>
  <tools-screen>
    <template #title>
      <div class="text-2xl font-bold">JSON Objects Editor</div>
    </template>
    <ion-fab horizontal="end" vertical="bottom" slot="fixed">
      <ion-fab-button id="open-action-sheet">
        <ion-icon :icon="add"></ion-icon>
      </ion-fab-button>
    </ion-fab>
    <ion-action-sheet trigger="open-action-sheet" :buttons="actionSheetButtons" @did-dismiss="onAction" />
    <div class="flex flex-col p-4 md:max-w-[600px] md:mx-auto">
      <div class="hidden py-10" data-testid="debug-json-data">Debug: {{ jsonData }}</div>
      <div v-for="fieldGroup in allFieldGroups" :key="fieldGroup.name">
        <div>
          <div class="mx-3 h-10 flex items-center">{{ fieldGroup.name }}</div>
        </div>
        <ion-list class="rounded-[20px] border-0 border-gray-500 p-2 pr-6 jsonFieldsList">
          <div v-for="field in fieldGroup.fields" :key="field.name">
            <ion-item :data-testid="`field-${field.type}-${field.fullPath}`">
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
              <div v-else-if="field.type === 'segment'" class="flex flex-row items-center w-full gap-4">
                <ion-label>{{ field.name }}</ion-label>
                <ion-segment class="flex-1" mode="ios" :value="get(jsonData, field.fullPath) || field.defaultValue" @ionChange="updateField(field.fullPath, $event)">
                  <ion-segment-button v-for="choice in field.choices" :key="choice" :value="choice">
                    <ion-label>{{ choice }}</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </div>
              <ion-toggle
                v-else-if="field.type === 'toggle'"
                :checked="get(jsonData, field.fullPath)"
                @ionChange="updateField(field.fullPath, $event)">
                {{ field.name }}
              </ion-toggle>
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
import { IonIcon, IonInput, IonItem, IonList, IonSegment, IonTextarea, IonToggle, IonFab, IonFabButton, IonActionSheet, ActionSheetButton } from '@ionic/vue';
import { camera, add } from 'ionicons/icons';
import { newFieldGroup, FieldGroupDescriptor, FieldDescriptor, walkJsonSchemaForAllFields, getShallowArrayPaths } from './json.utils';
import { useAppLanguageLocale } from '../utils/i18n';
import { useToolsContent } from './content';
import { toolContentKeys } from './contentKeys';
import ToolsScreen from './ToolsScreen.vue';
import IntlMessageFormat from 'intl-messageformat';

const [miscGroupName, emailHint, urlHint, passwordHint, telHint, numberHint, addFlatArray, cancelButtonText] = useToolsContent(toolContentKeys);
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


// These are "abstract" because array indices are not yet resolved.
const abstractFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  const knownPaths = new Set<string>();
  const groupsByName: Record<string, FieldGroupDescriptor> = {};
  const miscGroup = newFieldGroup(miscGroupName.value, true);

  // First, copy any manually declared field groups
  const { fieldLabels } = props.input.editorUiSchema;
  props.input.editorUiSchema.fieldGroups.forEach((fieldGroup) => {
    const { isSingleton, labelByLanguage, fields: rawFields } = fieldGroup;
    const fields: FieldDescriptor[] = rawFields
      .map(({ path, ...field }) => ({
        ...field,
        name: fieldLabels[locale.value]?.[path] ?? path,
        fullPath: (knownPaths.add(path), path),
        isSingleton: !!isSingleton
      }));
    if (labelByLanguage) {
      const groupName = labelByLanguage[locale.value];
      const group = groupsByName[groupName] ||= newFieldGroup(groupName, !!isSingleton);
      group.fields.push(...fields);
    }
  });

  // Then, derive remaining groups based on JSON Schema (misc group and groups organized by parent)
  const allFields = walkJsonSchemaForAllFields(props.input.jsonSchema);
  const allNamedGroups: string[] = Object.keys(fieldLabels[locale.value] ?? {});
  allNamedGroups.sort((a, b) => b.length - a.length);
  allFields.forEach((field) => {
    if (knownPaths.has(field.fullPath)) {
      return;
    }
    field.name = fieldLabels[locale.value]?.[field.fullPath] ?? field.fullPath;
    knownPaths.add(field.fullPath);

    const longestMatchingGroupPath = allNamedGroups.find((groupName) => field.fullPath.startsWith(groupName + "."));
    const matchingGroupName = longestMatchingGroupPath && fieldLabels[locale.value]?.[longestMatchingGroupPath];
    if (matchingGroupName) {
      const isSingleton = !matchingGroupName.includes("{index}");
      groupsByName[matchingGroupName] ||= newFieldGroup(matchingGroupName, isSingleton);
      groupsByName[matchingGroupName].fields.push(field);
    } else if (field.isSingleton) {
      // Only Singleton groups can fall back to the misc group
      miscGroup.fields.push(field);
    }
  });
  return [...Object.values(groupsByName), miscGroup];
});

const singletonFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  return abstractFieldGroups.value.filter((group) => group.isSingleton);
});

// Derive array groups only if we have a fieldLabel for them
const arrayFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  const groups = abstractFieldGroups.value.filter((group) => !group.isSingleton);
  return groups.flatMap((group) => {
    const arrayLengths = getShallowArrayPaths(group).map((path) =>
      get(jsonData.value, path)?.length ?? 0
    );
    const validLength = Math.min(...arrayLengths);

    // Create new copies of the original abstract array groups, based on actual array lengths
    return Array(validLength).fill(0).map((_, i) => {
      const groupName = new IntlMessageFormat(group.name, locale.value).format({ index: i + 1 });
      const arrayItemGroup = newFieldGroup(String(groupName), false);
      arrayItemGroup.fields.push(...group.fields.map((field) => ({
        ...field,
        fullPath: field.fullPath.replace("{index}", String(i)),
      })));
      return arrayItemGroup;
    });
  });
});

const actionSheetButtons = computed(() => abstractFieldGroups.value.flatMap((group) => {
  if (group.isSingleton) {
    return [];
  }
  const arrayLengths = getShallowArrayPaths(group).map((path) =>
    get(jsonData.value, path)?.length ?? 0
  );
  const validLength = Math.min(...arrayLengths);
  const nextItemName = new IntlMessageFormat(group.name, locale.value).format({ index: validLength + 1 });
  return [{
    text: new IntlMessageFormat(addFlatArray.value, locale.value).format({ name: nextItemName }),
    data: {
      action: "add-flat-array-item",
      groupName: group.name,
    }
  }] as ActionSheetButton[];
}).concat([{
  text: cancelButtonText.value,
  role: "cancel",
  data: {
    action: "cancel",
  }
}]));

const allFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  return [...singletonFieldGroups.value, ...arrayFieldGroups.value];
});

const updateField = (fullPath: string, event: Event) => {
  const { target } = event;
  const value = (event.target as HTMLInputElement).value;
  if (target && 'checked' in target && 'role' in target && target.role === 'switch') {
    set(jsonData.value, fullPath, target.checked);
    return;
  }
  set(jsonData.value, fullPath, value);
};

const onAction = (event: CustomEvent) => {
  const data = event?.detail?.data;
  if (!data || typeof data !== "object") {
    return;
  }
  const { action, groupName } = data;
  if (action === "add-flat-array-item") {
    const group = abstractFieldGroups.value.find((group) => group.name === groupName);
    if (!group) {
      return;
    }
    const arrayPaths = getShallowArrayPaths(group);
    const arrayLengths = arrayPaths.map((path) =>
      get(jsonData.value, path)?.length ?? 0
    );
    const minLength = Math.min(...arrayLengths);
    const maxLength = Math.max(...arrayLengths);
    let arrayPathsToUpdate = arrayPaths;
    if (minLength !== maxLength) {
      arrayPathsToUpdate = arrayPaths.filter((path) => get(jsonData.value, path)?.length === minLength);
    }
    new Set(arrayPathsToUpdate).forEach((path) => {
      set(jsonData.value, path, [...get(jsonData.value, path), {}]);
    });
  }
}

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