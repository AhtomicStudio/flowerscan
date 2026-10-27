import { z } from "zod";
import { IsoDateTimeSchema } from "./common";
import { ThemeSchema } from "./enums";

/**
 * App settings (docs/04 "Settings"). `age_confirmed_at: null` means the age gate hasn't been passed.
 * `age_declined_at` records a Leave tap; the app stays closed for 24 hours after it (D8).
 */
export const SettingsSchema = z.strictObject({
  age_confirmed_at: IsoDateTimeSchema.nullable(),
  age_declined_at: IsoDateTimeSchema.nullable(),
  theme: ThemeSchema,
  haptics: z.boolean(),
  last_backup_at: IsoDateTimeSchema.nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;
