/**
 * Globální TypeScript definice
 */

declare global {
  interface Window {
    /**
     * Dočasné úložiště pro user data z postMessage
     * Nastavuje se v inline scriptu v embed.html PŘED načtením Reactu
     * Pro řešení timing race condition kdy klient posílá data před mount
     */
    __PENDING_USER_DATA__: {
      id?: string | number;
      email?: string;
      firstName?: string;
      lastName?: string;
      position?: string;
      tokenEshop?: string;
    } | null;
  }
}

export {};
