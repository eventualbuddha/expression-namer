import nodeResolve from 'rollup-plugin-node-resolve';

var pkg = require('./package.json');

export default {
  entry: 'src/index.js',
  plugins: [nodeResolve({ jsnext: true })],
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
