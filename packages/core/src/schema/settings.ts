import { z } from "zod";
import { IsoDateTimeSchema } from "./common";
import { ScanModeSchema, ThemeSchema } from "./enums";

/** App settings (docs/04 "Settings"). `age_confirmed_at: null` means the age gate hasn't been passed. */
export const SettingsSchema = z.strictObject({
  age_confirmed_at: IsoDateTimeSchema.nullable(),
  theme: ThemeSchema,
  default_mode: ScanModeSchema,
  haptics: z.boolean(),
  last_backup_at: IsoDateTimeSchema.nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;
