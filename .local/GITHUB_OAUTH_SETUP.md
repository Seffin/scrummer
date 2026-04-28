# GitHub OAuth App Setup for Device Flow

This guide explains how to set up a GitHub OAuth App to enable Device Flow authentication in WorkTrack.

## Why Device Flow?

Device Flow authentication provides a better user experience compared to Personal Access Tokens:
- Users only need to enter a short 8-digit code
- No need to copy-paste long tokens
- More secure - tokens are handled automatically
- Better mobile experience

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: WorkTrack (Local)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173`
   - **Application description**: Time tracking application with GitHub integration

### 2. Configure the App

After creating the app, you'll get:
- **Client ID**: This is what you need for device flow
- **Client Secret**: Not needed for device flow, but keep it secure

### 3. Update WorkTrack Configuration

1. Open `src/lib/github/device-flow.ts`
2. Replace `YOUR_CLIENT_ID` with your actual Client ID:
   ```typescript
   const CLIENT_ID = 'your_actual_client_id_here';
   ```

### 4. Enable Device Flow

Device Flow is automatically enabled for all GitHub OAuth Apps. No additional configuration needed.

## Testing the Setup

1. Restart your development server
2. Open WorkTrack and click "Login to GitHub"
3. You should see the Device Flow interface with a short code
4. Follow the instructions to authorize the app

## Security Considerations

- **Client ID**: Can be public, but don't commit it to public repositories
- **Client Secret**: Keep secure, not needed for device flow
- **Scopes**: WorkTrack requests `repo` and `read:org` scopes
- **Callback URL**: Must match your development/production URL

## Environment Variables (Optional)

For better security, you can use environment variables:

1. Create `.env.local` in your project root:
   ```
   VITE_GITHUB_CLIENT_ID=your_actual_client_id_here
   ```

2. Update `device-flow.ts`:
   ```typescript
   const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'YOUR_CLIENT_ID';
   ```

## Production Deployment

For production deployment:
1. Create a separate OAuth App for production
2. Update the Homepage URL and Authorization callback URL
3. Use environment variables for the Client ID
4. Ensure HTTPS is enabled (required for production OAuth Apps)

## Troubleshooting

### "Device Flow not configured" Error
- Make sure you've replaced `YOUR_CLIENT_ID` with your actual Client ID
- Check that the Client ID is correctly copied (no extra spaces)

### "Redirect URI mismatch" Error
- Ensure the Authorization callback URL in GitHub matches your app URL
- For local development: `http://localhost:5173`
- For production: `https://your-domain.com`

### Device Flow Not Working
- Make sure your OAuth App is active
- Check that you're using the correct Client ID
- Verify the scopes include `repo` and `read:org`

## Migration from PAT to Device Flow

Users currently using PAT authentication will continue to work. Device Flow is offered as the default, but PAT authentication remains available as a fallback option.

## Next Steps

After setting up the OAuth App:
1. Test the device flow authentication
2. Verify that all GitHub API operations work
3. Consider deprecating PAT authentication in a future release
4. Update documentation to reflect the new authentication method
