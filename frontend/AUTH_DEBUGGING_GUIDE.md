# Authentication Debugging Guide

## 🔍 Problem: "Keep me logged in for 30 days" not working on deployment

The user reports that the authentication doesn't persist after page reload on the deployed version, even when the "keep me logged in for 30 days" checkbox is selected.

## ✅ Solutions Implemented

### 1. Enhanced Token Management (`frontend/src/utils/auth.js`)

**Changes Made:**

- Added robust error handling for localStorage operations
- Enhanced token validation with detailed logging
- Added metadata tracking (token set time, expected expiration)
- Improved debugging capabilities with getAuthDebugInfo() function

**Key Features:**

- Better error handling for localStorage access issues
- Detailed logging for production debugging
- Metadata storage for troubleshooting
- New `getAuthDebugInfo()` function for comprehensive diagnostics

### 2. CORS Configuration Updates

**Files Modified:**

- `backend/index.js`
- `api/index.js`

**Changes Made:**

- Enhanced CORS configuration with proper authentication support
- Added `credentials: true` for authentication headers
- Configured allowed origins for production domains
- Added support for Vercel preview URLs

### 3. Enhanced Request/Response Interceptors (`frontend/src/api/axios.js`)

**Changes Made:**

- Better error logging for 401 responses
- Enhanced token clearing mechanism
- Improved debugging information
- More reliable redirect logic

### 4. Production Debugging Tools

**Added to `frontend/src/pages/LoginPage.js`:**

- Global `authDebug()` function accessible from browser console
- Enhanced logging after successful login
- localStorage functionality testing

## 🔧 Debugging Steps for Production

### Step 1: Use Browser Console Debugging

1. Open your deployed app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run: `authDebug()`

This will output comprehensive authentication state information.

### Step 2: Check localStorage Functionality

The `authDebug()` function automatically tests localStorage. Look for:

```
📦 localStorage test: ✅ WORKING
```

If it shows `❌ FAILED`, localStorage is not working (possible causes: private browsing, browser settings, etc.)

### Step 3: Monitor Authentication Flow

1. Open Network tab in Developer Tools
2. Login with "Keep me logged in" checked
3. Look for the `/auth/login` request
4. Check the response includes a token
5. Verify console logs show token storage success

### Step 4: Test Page Reload Persistence

1. After successful login, check console for:
   ```
   ✅ Token stored successfully
   ```
2. Reload the page
3. Check if authentication persists
4. Run `authDebug()` again to see current state

## 🐛 Common Issues and Solutions

### Issue 1: localStorage Not Available

**Symptoms:** Token doesn't persist, `authDebug()` shows localStorage test failed
**Solutions:**

- User is in private/incognito mode
- Browser settings block localStorage
- Corporate firewall/proxy issues

### Issue 2: Token Expires Immediately

**Symptoms:** User gets logged out immediately after login
**Solutions:**

- Check server time vs client time
- Verify JWT_SECRET is set correctly in production
- Check if backend is properly generating 30-day tokens

### Issue 3: CORS Issues

**Symptoms:** Network errors, authentication requests fail
**Solutions:**

- Verify production domain is in CORS allowedOrigins
- Check if Vercel preview URLs need to be added
- Ensure API routes are properly configured

### Issue 4: Domain/Environment Issues

**Symptoms:** Works locally but not in production
**Solutions:**

- Check if production uses HTTPS (required for certain browser features)
- Verify environment variables are set in Vercel
- Check if subdomain/path differences affect localStorage

## 🔍 Detailed Debugging Commands

### Check Current Authentication State

```javascript
authDebug();
```

### Test localStorage Manually

```javascript
localStorage.setItem("test", "value");
console.log(localStorage.getItem("test")); // Should log 'value'
localStorage.removeItem("test");
```

### Check Token Expiration

```javascript
const token = localStorage.getItem("token");
if (token) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  console.log("Token expires:", new Date(payload.exp * 1000));
  console.log("Current time:", new Date());
  console.log(
    "Time until expiry (hours):",
    (payload.exp * 1000 - Date.now()) / (1000 * 60 * 60)
  );
}
```

### Clear All Authentication Data

```javascript
["token", "keepLoggedIn", "tokenSetAt", "tokenExpectedExp"].forEach((item) =>
  localStorage.removeItem(item)
);
location.reload();
```

## 📊 Expected Debug Output

When `authDebug()` is working correctly, you should see:

```json
{
  "hasToken": true,
  "tokenLength": 180,
  "keepLoggedIn": true,
  "tokenSetAt": "2024-01-15T10:30:00.000Z",
  "expectedExp": "2024-02-14T10:30:00.000Z",
  "tokenInfo": {
    "userId": "user123",
    "issuedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-02-14T10:30:00.000Z",
    "timeUntilExpiry": 2592000,
    "hoursUntilExpiry": 720,
    "isExpired": false
  },
  "localStorage": {
    "available": true,
    "itemCount": 4
  }
}
```

## 🚨 Emergency Recovery

If users are completely locked out:

1. Clear all site data:

   - Chrome: Settings > Privacy > Clear browsing data > Cookies and site data
   - Firefox: Developer Tools > Storage tab > Clear all

2. Or use browser console:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

## 📝 Next Steps for Investigation

1. **Deploy the fixes** to production
2. **Test on multiple browsers** (Chrome, Firefox, Safari, Edge)
3. **Test on mobile devices** (iOS Safari, Chrome Mobile)
4. **Monitor production logs** for authentication errors
5. **Check Vercel environment variables** are properly set
6. **Verify MONGODB_URI and JWT_SECRET** are configured in production

## 🔐 Security Considerations

- The debug function only runs in the browser console (not exposed in UI)
- No sensitive data is logged (tokens are only shown by length)
- Debug info can be disabled by removing the global function
- All debugging respects production security practices

## 📞 Support Information

If issues persist after implementing these fixes:

1. Share the output of `authDebug()` from production
2. Check browser console for any error messages
3. Test with different browsers and devices
4. Verify the issue occurs consistently or intermittently
