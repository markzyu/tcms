import { AppLanguages } from "@tcms/mini-app-common";
import { inject, InjectionKey, Ref, ref } from "vue";

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