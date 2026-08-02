<template>
  <tools-screen>
    <template #title>
      <div class="text-2xl font-bold">{{ fallbackTitle }}</div>
    </template>
    <template #button1>
      <ion-button size="small" fill="clear" data-testid="json-objects-editor-back-button" @click="onBack">
        <ion-icon :icon="arrowBack" slot="icon-only"></ion-icon>
      </ion-button>
    </template>
    <template #button2>
      <ion-button data-testid="json-objects-editor-save-button" :disabled="disableSaveButton" @click="onSave">{{ saveButtonText }}</ion-button>
    </template>
    <ion-fab v-if="actionSheetButtons.length > 1" horizontal="end" vertical="bottom" slot="fixed">
      <ion-fab-button id="open-action-sheet">
        <ion-icon :icon="add"></ion-icon>
      </ion-fab-button>
    </ion-fab>
    <ion-action-sheet trigger="open-action-sheet" :buttons="actionSheetButtons" @did-dismiss="onAction" />
    <div class="hidden py-10" data-testid="debug-json-data">Debug: {{ jsonData }}</div>
    <div data-testid="field-groups-grid" class="flex flex-col p-4 transition-all duration-300 ease-in-out md:max-w-[720px] lg:max-w-[960px] md:mx-auto md:grid md:grid-flow-col md:gap-x-4 lg:gap-x-8 md:grid-cols-2" :style="gridStyles">
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
              <div v-else-if="field.type === 'media'" class="flex flex-col w-full items-end">
                <ion-input
                  type="text"
                  disabled
                  :class="field.validationError ? 'placeholder-error' : ''"
                  :label="field.name"
                  :value="field.validationError ? '' : get(jsonData, field.fullPath)"
                  :placeholder="field.validationError" />
                <div class="w-[66%] flex justify-center">
                  <div class="mx-[25px] my-[10px] w-[100px] h-[100px] bg-gray-100 dark:bg-black flex items-center justify-center" :data-testid="`media-picker-${field.fullPath}`" @click="onChooseMedia(field)">
                    <img v-if="get(jsonData, field.fullPath)" :src="get(jsonData, field.fullPath)" alt="Media" class="w-full h-full object-cover" />
                    <ion-icon v-else aria-label="Upload image" :icon="camera" size="large" />
                  </div>
                </div>
              </div>
              <div v-else-if="field.type === 'segment'" class="flex flex-row items-center w-full gap-4">
                <ion-label>{{ field.name }}</ion-label>
                <ion-segment class="flex-1" mode="ios" :value="get(jsonData, field.fullPath)" @ionChange="updateField(field.fullPath, $event)">
                  <ion-segment-button v-for="choice in field.choices" :key="choice" :value="choice">
                    <ion-label>{{ field.segmentNames?.[choice] ?? choice }}</ion-label>
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
              <ion-note v-if="field.validationError && field.type !== 'media'" color="danger" slot="end">{{ field.validationError }}</ion-note>
            </ion-item>
          </div>
        </ion-list>
      </div>
    </div>
  </tools-screen>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { ToolProps } from './toolTypes';
import { get, isEqual, set } from 'lodash';
import { IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton, IonTextarea, IonToggle, IonFab, IonFabButton, IonActionSheet, ActionSheetButton, IonButton, alertController, AlertButton } from '@ionic/vue';
import { camera, add, arrowBack } from 'ionicons/icons';
import { newFieldGroup, FieldGroupDescriptor, FieldDescriptor, walkJsonSchemaForAllFields, getShallowArrayPaths, getShallowArrayPath, getRequiredFields } from './json.utils';
import { useAppLanguageLocale } from '../utils/i18n';
import { useToolsContent } from './content';
import { toolContentKeys } from './contentKeys';
import ToolsScreen from './ToolsScreen.vue';
import IntlMessageFormat from 'intl-messageformat';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';

const [
  miscGroupName,
  emailHint, urlHint, passwordHint, telHint, numberHint,
  addFlatArray, cancelButtonText, saveButtonText,
  editDetailsButtonText, deleteButtonText, deleteConfirmButtonText,
  validationRequiredField, validationInvalidValue,
  fallbackTitle,
  confirmBackAlertHeader, confirmBackAlertMessage,
  confirmBackAlertCancelButton, confirmBackAlertOKButton,
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
const jsonData = ref<any>(JSON.parse(JSON.stringify(props.input.json)));
const confirmDeletionOfGroupName = ref<string | null>(null);

// This value differs from props.input.json because we apply some default value fixes on mount.
const initialJsonData = ref<any>(JSON.parse(JSON.stringify(props.input.json)));

// These are "abstract" because array indices are not yet resolved.
const abstractFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  const knownPaths = new Set<string>();
  const fieldPathToGroupName: Record<string, string | undefined> = {};
  const singletonGroups: Set<string> = new Set();
  const groupsByName: Record<string, FieldGroupDescriptor> = {};
  const miscGroup = newFieldGroup(miscGroupName.value, locale.value);

  // First, find relationship between field paths and group names
  const { fieldLabels } = props.input.editorUiSchema;
  props.input.editorUiSchema.fieldGroups.forEach((fieldGroup) => {
    const { isSingleton, labelByLanguage, fields: rawFields } = fieldGroup;
    const groupName = labelByLanguage?.[locale.value] || undefined;
    rawFields.forEach(({ path }) => {
      fieldPathToGroupName[path] = groupName;
    });
    if (isSingleton && groupName) {
      singletonGroups.add(groupName);
    }
  });

  // Then, derive remaining groups based on JSON Schema (misc group and groups organized by parent)
  const requiredFields = getRequiredFields(props.input.jsonSchema);
  const allFields = walkJsonSchemaForAllFields(props.input.jsonSchema, requiredFields);
  const allNamedGroups: string[] = Object.keys(fieldLabels[locale.value] ?? {});
  allNamedGroups.sort((a, b) => b.length - a.length);
  allFields.forEach((field) => {
    if (knownPaths.has(field.fullPath)) {
      return;
    }
    field.name = fieldLabels[locale.value]?.[field.fullPath] ?? field.fullPath;
    if (field.type === 'segment') {
      field.segmentNames = Object.fromEntries(field.choices?.map((choice) => 
        [choice, fieldLabels[locale.value]?.[`${field.fullPath}.${choice}`]]
      ) || []);
    }
    knownPaths.add(field.fullPath);

    const preferredGroupName = fieldPathToGroupName[field.fullPath];
    if (preferredGroupName) {
      const isSingleton = singletonGroups.has(preferredGroupName);
      const group = groupsByName[preferredGroupName] ||= newFieldGroup(preferredGroupName, locale.value, isSingleton ? undefined : 0);
      group.fields.push(field);
      return;
    }

    // Fallback: if not specified in fieldGroups, try to group based on fieldLabels
    const longestMatchingGroupPath = allNamedGroups.find((groupName) => field.fullPath.startsWith(groupName + "."));
    const matchingGroupName = longestMatchingGroupPath && fieldLabels[locale.value]?.[longestMatchingGroupPath];
    if (matchingGroupName) {
      const isSingleton = !matchingGroupName.includes("{index}");
      groupsByName[matchingGroupName] ||= newFieldGroup(matchingGroupName, locale.value, isSingleton ? undefined : 0);
      groupsByName[matchingGroupName].fields.push(field);
      return;
    }
    
    // Only Singleton groups can fall back to the misc group
    if (field.isSingleton) {
      miscGroup.fields.push(field);
    }
  });

  // Then, copy the uiEditorSchema field groups as overrides of json schema behaviors
  props.input.editorUiSchema.fieldGroups.forEach((fieldGroup) => {
    const { isSingleton, labelByLanguage, fields: rawFields } = fieldGroup;
    const groupName = labelByLanguage?.[locale.value];
    const group = groupName ? groupsByName[groupName] : miscGroup;
    rawFields.forEach(({ path, ...field }) => {
      const fieldToWrite = group.fields.find((f) => f.fullPath === path);
      if (fieldToWrite) {
        Object.assign(fieldToWrite, field);
        fieldToWrite.name = fieldLabels[locale.value]?.[path] ?? path;
        fieldToWrite.arrayPath = getShallowArrayPath(path);
        fieldToWrite.isSingleton = !!isSingleton;
      }
    });
  });
  return [...Object.values(groupsByName), miscGroup];
});

const performFieldValidations = (field: FieldDescriptor) => {
  const rawValue = get(jsonData.value, field.fullPath);
  const isEmptyOptionalValue = !field.isRequired && rawValue === "";
  const isUndefinedOrNull = rawValue === undefined || rawValue === null || isEmptyOptionalValue;
  if (field.isRequired && isUndefinedOrNull) {
    return {
      ...field,
      validationError: validationRequiredField.value, 
    };
  }
  if (isUndefinedOrNull) {
    // Not a required field. Don't validate (or the undefined/null values can cause confusion)
    return field;
  }
  if (field.jsonSchema && typeof field.jsonSchema === "object") {
    const { error } = convertJsonSchemaToZod(field.jsonSchema).safeParse(get(jsonData.value, field.fullPath));
    if (!error) {
      return field;
    }
    console.warn(`Invalid value for field ${field.fullPath}: ${get(jsonData.value, field.fullPath)}`, error);
    return {
      ...field,
      validationError: validationInvalidValue.value,
    };
  }
  return field;
};

const singletonFieldGroups = computed<FieldGroupDescriptor[]>(() => {
  return abstractFieldGroups.value.filter((group) => group.isSingleton).map((group) => ({
    ...group,
    fields: group.fields.map(performFieldValidations),
  }));
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
      arrayItemGroup.fields = group.fields.map((field) => ({
        ...field,
        fullPath: field.fullPath.replace("{index}", String(i)),
        arrayIndex: i,
      })).map(performFieldValidations);
      return arrayItemGroup;
    });
  });
});

const allFieldGroups = computed<(FieldGroupDescriptor | null)[]>(() => {
  let leftGroups = singletonFieldGroups.value;
  let rightGroups = arrayFieldGroups.value;
  if (rightGroups.length === 0) {
    const halfLength = Math.ceil(leftGroups.length / 2);
    rightGroups = leftGroups.slice(halfLength);
    leftGroups = leftGroups.slice(0, halfLength);
  }
  const maxLength = Math.max(leftGroups.length, rightGroups.length);
  return [
    ...leftGroups, ...Array(maxLength - leftGroups.length).fill(null),
    ...rightGroups, ...Array(maxLength - rightGroups.length).fill(null),
  ];
});

const disableSaveButton = computed(() => {
  return allFieldGroups.value.some((group) => {
    if (group) {
      return group.fields.some((field) => field.validationError);
    }
    return false;
  });
});

// Set default values for required toggles and segments
onMounted(() => nextTick(() => {
  allFieldGroups.value.forEach((group) => {
    if (group) {
      group.fields.forEach((field) => {
        if (field.type === 'toggle' && field.isRequired) {
          set(jsonData.value, field.fullPath, false);
        }
        if (field.type === 'segment' && field.isRequired) {
          set(jsonData.value, field.fullPath, field.defaultValue || field.choices?.[0]);
        }
      });
    }
  });
  initialJsonData.value = JSON.parse(JSON.stringify(jsonData.value));
}));


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
      const oldArr = get(jsonData.value, path) || [];
      set(jsonData.value, path, [...oldArr, {}]);
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

const onChooseMedia = (field: FieldDescriptor) => {
  props.onAction({
    type: "chooseMedia",
    onMediaUrl: (mediaUrl: string) => {
      set(jsonData.value, field.fullPath, mediaUrl);
    },
  });
};

const onSave = async () => {
  await props.onAction({
    type: "saveText",
    text: JSON.stringify(jsonData.value, null, 2),
    filePath: {
      ...props.input.savePath
    }
  });
  await props.onAction({
    type: "closeWorkflow",
  });
};

const onBack = async () => {
  const confirmBackAlertButtons: AlertButton[] = [
    {
      text: confirmBackAlertCancelButton.value,
      role: "cancel",
    },
    {
      text: confirmBackAlertOKButton.value,
      role: "destructive",
      handler: () => {
        props.onAction({
          type: "closeWorkflow",
        });
      },
    },
  ];

  if (!isEqual(jsonData.value, initialJsonData.value)) {
    const alert = await alertController.create({
      header: confirmBackAlertHeader.value,
      message: confirmBackAlertMessage.value,
      buttons: confirmBackAlertButtons,
      htmlAttributes: {
        "data-testid": "json-objects-editor-confirm-back-alert",
      }
    });
    await alert.present();
    return;
  }
  props.onAction({
    type: "closeWorkflow",
  });
};

</script>

<style scoped>

.jsonFieldsList {
  --ion-item-background: #D9D9D9;
}

.placeholder-error {
  --placeholder-color: red;
  --placeholder-opacity: 1;
}

@media (prefers-color-scheme: dark) {
  .jsonFieldsList {
    --ion-item-background: #2D2D2D;
  }
}
</style>