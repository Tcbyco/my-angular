module.exports = function (config) {
  config.set({
    frameworks: ["parcel", "jasmine"],
    files: [
      "src/**/*.js",
      "test/**/*_spec.js",
      {
        // parcel tests should not be watched. Parcel will do the
        // watching instead
        pattern: "parcel/**/*.js",
        watched: false,
        included: false,
      },
    ],
    preprocessors: {
      "test/**/*.js": ["jshint", "parcel"],
      "src/**/*.js": ["jshint", "parcel"],
      "parcel/*": ["parcel"],
    },
    browsers: ["Firefox"],
    parcelConfig: {
      cacheDir: "./.cache", // default: "./.cache"
      detailedReport: false, // default: false,
      logLevel: 2, // default: 1
    },
  });
};
