// src/config/googleCalendar.ts
export const googleCalendarConfig = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '93249028646-fhnh0p01t9o81op4bg1566rj1kp2mh3c.apps.googleusercontent.com',
  clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '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',
  redirectUri: process.env.REACT_APP_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};