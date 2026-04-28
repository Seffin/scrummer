# Mobile Setup Guide

## Running the App on Mobile Devices

### Option 1: Local Network Access (Recommended for Development)

1. **Start the development server with network access:**
   ```bash
   bun run dev --host
   # or
   npm run dev --host
   ```

2. **Find your local IP address:**
   - **Windows:** Open Command Prompt and run `ipconfig`
   - **Mac/Linux:** Open Terminal and run `ifconfig` or `ip addr`
   - Look for your WiFi network adapter (usually 192.168.x.x or 10.0.x.x)

3. **Connect from mobile:**
   - Ensure your mobile device is on the same WiFi network
   - Open a browser on your mobile device
   - Navigate to: `http://YOUR_IP_ADDRESS:5173`
   - Example: `http://192.168.1.102:5173`

### Option 2: Using ngrok (External Access)

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # or via npm: npm install -g ngrok
   ```

2. **Start your dev server:**
   ```bash
   bun run dev
   ```

3. **Create ngrok tunnel:**
   ```bash
   ngrok http 5173
   ```

4. **Use the ngrok URL on mobile:**
   - ngrok will give you a public URL like `https://random-string.ngrok.io`
   - Use this URL on any mobile device with internet access

### Option 3: Vercel/Netlify Deploy (Production)

1. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Deploy to Netlify:**
   ```bash
   # Install Netlify CLI
   npm i -g netlify-cli
   
   # Build and deploy
   npm run build
   netlify deploy --prod --dir=.svelte-kit/output/client
   ```

## Mobile Optimization Features

The app includes mobile-friendly features:

- ✅ Responsive design with Tailwind CSS
- ✅ Touch-friendly buttons and inputs
- ✅ Mobile-optimized authentication flow
- ✅ GitHub CLI integration works on mobile browsers
- ✅ Session-based authentication for multiple users

## Troubleshooting

### "Connection Refused" Error
- Ensure your dev server is running with `--host` flag
- Check that both devices are on the same WiFi network
- Verify firewall isn't blocking port 5173

### GitHub CLI on Mobile
- GitHub CLI authentication works through the browser
- No need to install GitHub CLI on mobile
- Authentication happens via GitHub's web interface

### Performance Tips
- Use WiFi instead of cellular data for better performance
- Close other apps to free up memory on mobile
- Refresh the page if you experience slow loading

## Security Notes

- Development mode (`--host`) exposes your app to local network only
- Use ngrok or production deploy for external access
- Each browser session maintains separate authentication
- Tokens are stored securely in browser localStorage
