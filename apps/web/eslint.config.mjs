import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    // Downgrade pre-existing violations that existed before lint was
    // configured (next lint was removed in Next.js 16). New code should
    // still avoid these patterns; they are set to 'warn' rather than 'off'
    // so violations remain visible.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
];
