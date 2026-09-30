import { Global, Module } from "@nestjs/common";
import { config } from "@shared/config/config";

export const CONFIG = "CONFIG";

/**
 * Makes the convict config injectable anywhere via `@Inject(CONFIG)`, for the
 * places where importing the singleton directly would make a unit test awkward.
 */
@Global()
@Module({
  providers: [{ provide: CONFIG, useValue: config }],
  exports: [CONFIG],
})
export class ConfigurationModule {}
