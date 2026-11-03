export type TelegramWebApp = {
  initData: string;
  colorScheme?: "light" | "dark";
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

export function initializeTelegramWebApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  webApp.ready?.();
  webApp.expand?.();
  webApp.setHeaderColor?.("#0b0f14");
  webApp.setBackgroundColor?.("#0b0f14");

  const theme = webApp.themeParams;
  if (theme?.text_color) {
    document.documentElement.style.setProperty("--tg-theme-text-color", theme.text_color);
  }
  if (theme?.hint_color) {
    document.documentElement.style.setProperty("--tg-theme-hint-color", theme.hint_color);
  }
}
