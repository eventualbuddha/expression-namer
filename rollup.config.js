var pkg = require('./package.json');

export default {
  entry: 'src/index.js',
  external: Object.keys(pkg['dependencies']),
  targets: [
    {
      format: 'es',
      dest: pkg['jsnext:main']
    },
    {
      format: 'cjs',
      dest: pkg['main']
    }
  ]
};
