import { AppLanguages } from "@tcms/mini-app-common";
import { computed, inject, InjectionKey, Ref, ref } from "vue";

// ----------------- Define the Provider ---------------------

export type AppLanguageContext = {
  locale: Ref<AppLanguages>;
  setLocale: (locale: AppLanguages) => void;
}

export const AppLanguageKey: InjectionKey<AppLanguageContext> = Symbol("AppLanguage");

export const useAppLanguageLocale = () => {
  const ctx = inject(AppLanguageKey);
  if (!ctx) {
    throw new Error("AppLanguageContext not found");
  }
  return ctx.locale;
}

export const createAppLanguageContext = (defaultLocale: AppLanguages): AppLanguageContext => {
  const locale = ref<AppLanguages>(defaultLocale);
  return {
    locale,
    setLocale: (value: AppLanguages) => {
      locale.value = value;
    },
  }
};

// ----------------- Helper to define&read contents of current locale ---------------------

export type Content<Key extends string> = Record<AppLanguages, Record<Key, string>>;

/**
 * Due to some odd transpiler limitation, we cannot call IntlMessageFormat.format()
 * on your behalf, so this will return only the template strings.
 */
export const useTemplateStringFactory = <Key extends string>(content: Content<Key>) => {
    const useSingleTemplateString = (key: Key) => {
      const locale = useAppLanguageLocale();
      return computed(() => content[locale.value][key]);
    }
    const useTemplateStrings = (key: readonly Key[]) => {
      return key.map(useSingleTemplateString);
    }
    return useTemplateStrings;
}