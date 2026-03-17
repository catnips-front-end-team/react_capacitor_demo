module.exports = {
  webpack: (config) => {
    // Disable code splitting — bundle everything into one JS file
    config.optimization.splitChunks = { cacheGroups: { default: false } };
    config.optimization.runtimeChunk = false;
    return config;
  },
};
