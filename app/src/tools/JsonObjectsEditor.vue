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
    <div class="hidden py-10" data-testid="debug-json-data">Debug: {{ jsonData }}</div>
    <div class="flex flex-col p-4 transition-all duration-300 ease-in-out md:max-w-[720px] lg:max-w-[960px] md:mx-auto md:grid md:grid-flow-col md:gap-x-4 lg:gap-x-8 md:grid-cols-2" :style="gridStyles">
      <div class="h-full md:flex md:flex-col" v-for="fieldGroup in allFieldGroups" :key="fieldGroup?.name">
        <div v-if="fieldGroup">
          <div class="mx-3 h-10 flex items-center gap-2">
            {{ fieldGroup.name }}
            <div class="w-full flex-shrink flex-1" />
            <ion-button v-if="!fieldGroup.isSingleton" size="small" fill="outline">{{ editDetailsButtonText }}</ion-button>
            <ion-button v-if="!fieldGroup.isSingleton && confirmDeletionOfGroupName !== fieldGroup.name" size="small" fill="outline" color="danger" @click="onDeleteArrayItem(fieldGroup)">{{ deleteButtonText }}</ion-button>
            <ion-button v-if="!fieldGroup.isSingleton && confirmDeletionOfGroupName === fieldGroup.name" size="small" color="danger" @click="onDeleteArrayItem(fieldGroup)">{{ deleteConfirmButtonText }}</ion-button>
          </div>
        </div>

        <!-- Placeholder to format Grid alignment on desktop/md viewports -->
        <div v-if="!fieldGroup" class="hidden md:block"></div>

        <ion-list v-else class="md:flex-1 rounded-[20px] border-0 border-gray-500 p-2 pr-6 jsonFieldsList">
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
import { IonIcon, IonInput, IonItem, IonLabel, IonList, IonSegment, IonSegmentButton, IonTextarea, IonToggle, IonFab, IonFabButton, IonActionSheet, ActionSheetButton, IonButton } from '@ionic/vue';
import { camera, add } from 'ionicons/icons';
import { newFieldGroup, FieldGroupDescriptor, FieldDescriptor, walkJsonSchemaForAllFields, getShallowArrayPaths, getShallowArrayPath } from './json.utils';
import { useAppLanguageLocale } from '../utils/i18n';
import { useToolsContent } from './content';
import { toolContentKeys } from './contentKeys';
import ToolsScreen from './ToolsScreen.vue';
import IntlMessageFormat from 'intl-messageformat';

const [
  miscGroupName,
  emailHint, urlHint, passwordHint, telHint, numberHint,
  addFlatArray, cancelButtonText, editDetailsButtonText, deleteButtonText, deleteConfirmButtonText
] = useToolsContent(toolContentKeys);
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
const confirmDeletionOfGroupName = ref<string | null>(null);


// These are "abstract" because array indices are not yet resolved.
const abstractFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  const knownPaths = new Set<string>();
  const groupsByName: Record<string, FieldGroupDescriptor> = {};
  const miscGroup = newFieldGroup(miscGroupName.value, locale.value);

  // First, copy any manually declared field groups
  const { fieldLabels } = props.input.editorUiSchema;
  props.input.editorUiSchema.fieldGroups.forEach((fieldGroup) => {
    const { isSingleton, labelByLanguage, fields: rawFields } = fieldGroup;
    const fields: FieldDescriptor[] = rawFields
      .map(({ path, ...field }) => ({
        ...field,
        name: fieldLabels[locale.value]?.[path] ?? path,
        fullPath: (knownPaths.add(path), path),
        arrayPath: getShallowArrayPath(path),
        isSingleton: !!isSingleton
      }));
    if (labelByLanguage) {
      const groupName = labelByLanguage[locale.value];
      const group = groupsByName[groupName] ||= newFieldGroup(groupName, locale.value, isSingleton ? undefined : 0);
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
      groupsByName[matchingGroupName] ||= newFieldGroup(matchingGroupName, locale.value, isSingleton ? undefined : 0);
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
      const arrayItemGroup = newFieldGroup(group.nameTemplate, locale.value, i);
      arrayItemGroup.fields.push(...group.fields.map((field) => ({
        ...field,
        fullPath: field.fullPath.replace("{index}", String(i)),
        arrayIndex: i,
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
  const nextItemName = new IntlMessageFormat(group.nameTemplate, locale.value).format({ index: validLength + 1 });
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

const allFieldGroups = computed<(FieldGroupDescriptor | null)[]>(() => {
  let leftGroups = singletonFieldGroups.value;
  let rightGroups = arrayFieldGroups.value;
  if (rightGroups.length === 0) {
    const halfLength = Math.floor(leftGroups.length / 2);
    rightGroups = leftGroups.slice(halfLength);
    leftGroups = leftGroups.slice(0, halfLength);
  }
  const maxLength = Math.max(leftGroups.length, rightGroups.length);
  return [
    ...leftGroups, ...Array(maxLength - leftGroups.length).fill(null),
    ...rightGroups, ...Array(maxLength - rightGroups.length).fill(null),
  ];
});

const gridStyles = computed(() => ({
  // On desktop, the grid needs configuration such that array groups show as a separate column.
  "grid-template-rows": `repeat(${allFieldGroups.value.length / 2}, 1fr)`,
}));

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
    
    // Edge case: clearing all references to group names because indices might have changed
    confirmDeletionOfGroupName.value = null;
  }
}

const onDeleteArrayItem = (group: FieldGroupDescriptor) => {
  if (confirmDeletionOfGroupName.value !== group.name) {
    confirmDeletionOfGroupName.value = group.name;
    return;
  }
  const visitedArrayPaths = new Set<string>();
  group.fields.forEach(({ arrayPath, arrayIndex }) => {
    if (!arrayPath || typeof arrayIndex !== "number") {
      return;
    }
    const oldArr = get(jsonData.value, arrayPath);
    if (!oldArr || !Array.isArray(oldArr)) {
      return;
    }

    // In the edge case where one refers to both {index} and {index +/- 1} of the same array,
    //    we delete only the index matching the group path (note: displayed index is 1-based)
    const groupNameAtIndex = new IntlMessageFormat(group.nameTemplate, locale.value).format({ index: arrayIndex + 1 });
    if (groupNameAtIndex !== group.name) {
      return;
    }

    if (visitedArrayPaths.has(arrayPath)) {
      return;
    }
    visitedArrayPaths.add(arrayPath);
    const newArr = oldArr.filter((_, i) => i !== arrayIndex);
    if (newArr.length === oldArr.length) {
      return;
    }
    set(jsonData.value, arrayPath, newArr);
  });
  confirmDeletionOfGroupName.value = null;
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