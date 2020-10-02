import { PAGE } from "./PAGE";
declare function asset_url(key: keyof typeof PAGE['assets']): string
declare function asset_filter(key: string): Record<string, string>