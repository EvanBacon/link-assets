import {
  ConfigPlugin,
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} from "@expo/config-plugins";
import fs from "fs";
import path from "path";
const debug = require("debug")("bacons:link-assets");

import { groupFilesByType } from "./groupFiles";

type Props = {
  font?: string[];
  image?: string[];
};

const withLinkedAsset: ConfigPlugin<string[]> = (config, props) => {
  const expanded = props
    .map((filePath) => {
      const resolved = path.resolve(config._internal?.projectRoot, filePath);
      if (fs.statSync(resolved).isDirectory()) {
        return fs
          .readdirSync(resolved)
          .map((file) => path.join(resolved, file));
      }
      return [resolved];
    })
    .flat();
  debug("All files:", expanded);

  const assets = groupFilesByType(expanded);
  debug("Grouped:", assets);
  withIosLinkedAsset(config, assets);
  withAndroidLinkedAsset(config, assets);
  return config;
};

const withAndroidLinkedAsset: ConfigPlugin<Props> = (config, { font }) => {
  withDangerousMod(config, [
    "android",
    (config) => {
      (font || []).forEach((asset) => {
        const fontsDir = path.join(
          config.modRequest.platformProjectRoot,
          "app/src/main/assets/fonts"
        );
        fs.mkdirSync(fontsDir, { recursive: true });
        const output = path.join(fontsDir, path.basename(asset));
        debug("Copying font:", asset, "to", output);
        fs.copyFileSync(asset, output);
      });
      return config;
    },
  ]);
  return config;
};

const withIosLinkedAsset: ConfigPlugin<Props> = (config, { font, image }) => {
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;

    IOSConfig.XcodeUtils.ensureGroupRecursively(project, "Resources");

    function addResourceFile(f?: Array<string>) {
      return (f ?? [])
        .map((asset) => {
          const absoluteAssetPath = path.relative(
            config.modRequest.platformProjectRoot,
            asset
          );
          debug(
            `Linking asset ${asset} -- ${absoluteAssetPath} -- ${
              project.getFirstTarget().uuid
            }`
          );
          return project.addResourceFile(absoluteAssetPath, {
            target: project.getFirstTarget().uuid,
          });
        })
        .filter(Boolean) // xcode returns false if file is already there
        .map((file) => file.basename);
    }

    addResourceFile(font);
    addResourceFile(image);

    return config;
  });

  config = withInfoPlist(config, (config) => {
    // console.log("set fonts:", fontList);
    // @ts-ignore Type mismatch with the lib
    const existingFonts = config.modResults.UIAppFonts || [];

    const fontList: any[] = font?.map((font) => path.basename(font)) ?? [];
    debug("Native iOS Fonts:", fontList);

    const allFonts = [
      // @ts-expect-error
      ...existingFonts,
      ...fontList,
    ];
    // @ts-ignore Type mismatch with the lib
    config.modResults.UIAppFonts = Array.from(new Set(allFonts));

    return config;
  });

  return config;
};

export default withLinkedAsset;
