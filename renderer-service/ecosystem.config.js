module.exports = {
  apps: [
    {
      name: 'socialmind-renderer',
      script: 'server.js',
      cwd: '/home/socialmind-renderer/renderer-service',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        RENDERER_API_KEY: process.env.RENDERER_API_KEY,
      },
      error_file: '/var/log/socialmind-renderer/error.log',
      out_file: '/var/log/socialmind-renderer/out.log',
      time: true,
    },
  ],
}
