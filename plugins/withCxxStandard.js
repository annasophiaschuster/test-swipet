/**
 * Expo config plugin: sets CLANG_CXX_LANGUAGE_STANDARD to gnu++20 for ALL
 * pod targets, fixing the `folly/coro/Coroutine.h file not found` error
 * that occurs with React Native 0.81 on Xcode 15+.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withCxxStandard = (config) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const patch = `
  # Fix: folly/coro/Coroutine.h not found (RN 0.81 + Xcode 16)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'
    end
  end
`;

      // Insert into existing post_install block (before the last `end` of it)
      if (!podfile.includes("gnu++20")) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${patch}`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);

module.exports = withCxxStandard;
