import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenFeature, OpenFeatureModule, TypedInMemoryProvider } from "@openfeature/nestjs-sdk";
import { FeatureFlagConfig, FeatureFlagConfigName } from "./feature-flag.config";
import { FEATURE_FLAGS } from "./feature-flag.const";
import { FeatureFlagController } from "./feature-flag.controller";
import { FeatureFlagService } from "./feature-flag.service";

const BOOLEAN_VARIANTS = { on: true, off: false } as const;

type BooleanVariants = typeof BOOLEAN_VARIANTS;

export const flagConfigurationOf = (config: FeatureFlagConfig) =>
  Object.fromEntries(
    FEATURE_FLAGS.map((flag) => [
      flag,
      {
        variants: BOOLEAN_VARIANTS,
        defaultVariant: config[flag] ? "on" : "off",
        disabled: false,
      },
    ]),
  ) as Record<
    (typeof FEATURE_FLAGS)[number],
    { variants: BooleanVariants; defaultVariant: keyof BooleanVariants; disabled: boolean }
  >;

@Module({
  imports: [OpenFeatureModule.forRoot({ useGlobalInterceptor: false })],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.get<FeatureFlagConfig>(FeatureFlagConfigName)!;
    await OpenFeature.setProviderAndWait(new TypedInMemoryProvider(flagConfigurationOf(config)));
  }
}
