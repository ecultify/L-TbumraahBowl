module.exports = {
  apps: [
    {
      name: 'bowling-web',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/html/bowling-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'bowling-render',
      script: 'npm',
      args: 'run render:server',
      cwd: '/var/www/html/bowling-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        PUPPETEER_EXECUTABLE_PATH: '/snap/chromium/current/usr/lib/chromium-browser/chrome'
      }
    }
  ]
};
