const babelTransformer = require("@expo/metro-config/babel-transformer");

module.exports = {
  ...babelTransformer,
  transform({ filename, src, options }) {
    // Replace import.meta.env with process.env for web compatibility
    if (src.includes("import.meta.env")) {
      src = src.replace(/import\.meta\.env/g, "process.env");
    }

    return babelTransformer.transform({ filename, src, options });
  },
};
